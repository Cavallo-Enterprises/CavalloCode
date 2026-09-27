import { readFile, writeFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import { safeStorage } from 'electron'
import type { CavalloAIConfiguration, CavalloAIContext } from '../../../../packages/plugin-api/src/index'

export type AIConfig = CavalloAIConfiguration
export type AIContext = CavalloAIContext

const defaults: AIConfig = { provider: 'openai', apiKey: '', model: 'gpt-4o-mini', endpoint: 'http://localhost:11434' }
let configPath = ''

export function initializeAIService(path: string) { configPath = path }

async function readStoredConfig(): Promise<AIConfig & { encryptedApiKey?: string }> {
  if (!configPath) return defaults
  try { return { ...defaults, ...JSON.parse(await readFile(configPath, 'utf8')) } }
  catch { return defaults }
}

function decryptKey(config: AIConfig & { encryptedApiKey?: string }): string {
  if (!config.encryptedApiKey) return config.apiKey || ''
  if (!safeStorage.isEncryptionAvailable()) throw new Error('OS secure storage is unavailable; configure secure storage before using a saved AI key.')
  return safeStorage.decryptString(Buffer.from(config.encryptedApiKey, 'base64'))
}

export async function getAIConfig() {
  const config = await readStoredConfig()
  return { provider: config.provider, model: config.model, endpoint: config.endpoint, apiKey: '', hasApiKey: Boolean(config.encryptedApiKey || config.apiKey) }
}

export async function configureAI(config: AIConfig) {
  if (!configPath) throw new Error('AI settings are not initialized.')
  const previous = await readStoredConfig()
  const apiKey = config.apiKey || (config.provider === previous.provider ? decryptKey(previous) : '')
  if (apiKey && !safeStorage.isEncryptionAvailable()) throw new Error('OS secure storage is unavailable; the API key was not saved.')
  const encryptedApiKey = apiKey ? safeStorage.encryptString(apiKey).toString('base64') : undefined
  await mkdir(dirname(configPath), { recursive: true })
  await writeFile(configPath, JSON.stringify({ provider: config.provider, model: config.model, endpoint: config.endpoint, ...(encryptedApiKey ? { encryptedApiKey } : {}) }, null, 2), 'utf8')
  return { success: true }
}

function buildSystemPrompt(context: AIContext) {
  return `You are AI Assistant, an embedded hardware engineering copilot. Help with firmware, debugging, pinouts, and memory use. Be precise and call out assumptions.\n\nActive file: ${context.fileName}\nTarget board: ${context.board}\n\nActive code:\n${context.code}\n\nRecent serial/build output (last 50 lines):\n${context.logs.split(/\r?\n/).slice(-50).join('\n')}`
}

export async function askAI(prompt: string, context: AIContext) {
  const stored = await readStoredConfig()
  const config = { ...stored, apiKey: decryptKey(stored) }
  const system = buildSystemPrompt(context)
  let response: Response
  if (config.provider === 'openai') {
    if (!config.apiKey) throw new Error('Configure an OpenAI API key in Settings first.')
    response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model || 'gpt-4o-mini', messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }) })
    const data = await response.json() as any
    if (!response.ok) throw new Error(data.error?.message || `OpenAI request failed (${response.status}).`)
    return data.choices?.[0]?.message?.content || ''
  }
  if (config.provider === 'gemini') {
    if (!config.apiKey) throw new Error('Configure a Gemini API key in Settings first.')
    const model = config.model || 'gemini-2.0-flash'
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }] }) })
    const data = await response.json() as any
    if (!response.ok) throw new Error(data.error?.message || `Gemini request failed (${response.status}).`)
    return data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') || ''
  }
  if (config.provider === 'anthropic') {
    if (!config.apiKey) throw new Error('Configure an Anthropic API key in Settings first.')
    response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: config.model || 'claude-3-5-haiku-latest', max_tokens: 2048, system, messages: [{ role: 'user', content: prompt }] }) })
    const data = await response.json() as any
    if (!response.ok) throw new Error(data.error?.message || `Anthropic request failed (${response.status}).`)
    return data.content?.map((part: any) => part.text || '').join('') || ''
  }
  response = await fetch(`${(config.endpoint || defaults.endpoint).replace(/\/$/, '')}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model || 'llama3.2', stream: false, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }) })
  const data = await response.json() as any
  if (!response.ok) throw new Error(data.error || `Ollama request failed (${response.status}).`)
  return data.message?.content || ''
}
