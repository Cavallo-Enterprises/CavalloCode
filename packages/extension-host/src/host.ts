import type { CavalloBoardDefinition, CavalloPlugin, ExtensionContext } from '../../plugin-api/src/index'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

interface ActivePlugin { id: string; path: string; plugin: CavalloPlugin; boards: CavalloBoardDefinition[]; themes: NonNullable<ReturnType<NonNullable<CavalloPlugin['registerThemes']>>>; commands: NonNullable<ReturnType<NonNullable<CavalloPlugin['registerCommands']>>>; subscriptions: ExtensionContext['subscriptions'] }

export class ExtensionHostManager {
  private readonly plugins = new Map<string, ActivePlugin>()

  async registerPlugin(id: string, plugin: CavalloPlugin, extensionPath: string) {
    await this.unloadPlugin(id)
    const subscriptions: ExtensionContext['subscriptions'] = []
    const context: ExtensionContext = { subscriptions, extensionPath }
    plugin.activate(context)
    const active = { id, path: extensionPath, plugin, boards: plugin.registerBoard?.() || [], themes: plugin.registerThemes?.() || [], commands: plugin.registerCommands?.() || [], subscriptions }
    this.plugins.set(id, active)
    return { id, boards: active.boards }
  }

  async loadPlugin(id: string, pluginPath: string) {
    const resolvedPath = resolve(pluginPath)
    const loaded = await import(pathToFileURL(resolvedPath).href) as { default?: CavalloPlugin }
    if (!loaded.default || typeof loaded.default.activate !== 'function') throw new Error(`Extension ${id} has no valid default plugin export.`)
    return this.registerPlugin(id, loaded.default, dirname(resolvedPath))
  }

  async unloadPlugin(id: string) {
    const active = this.plugins.get(id)
    if (!active) return
    for (const subscription of active.subscriptions) subscription.dispose()
    active.plugin.deactivate()
    this.plugins.delete(id)
  }

  listPlugins() {
    return [...this.plugins.values()].map(({ id, path, boards, themes, commands }) => ({ id, path, boards, themes, commands: commands.map(({ execute: _execute, ...command }) => command) }))
  }

  async executeCommand(id: string) {
    for (const plugin of this.plugins.values()) {
      const command = plugin.commands.find((candidate) => candidate.id === id)
      if (command) return command.execute()
    }
    throw new Error(`Extension command not found: ${id}`)
  }

  async dispose() {
    for (const id of this.plugins.keys()) await this.unloadPlugin(id)
  }
}
