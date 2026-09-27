import type { CavalloPlugin } from '../../../packages/plugin-api/src/index'

const plugin: CavalloPlugin = {
  activate() {},
  deactivate() {},
  registerCommands: () => [{
    id: 'builtin.pin-reference',
    title: 'Show common ESP32 and Uno pins',
    description: 'Quick reference for common GPIO and Arduino Uno pins.',
    execute: () => 'ESP32: avoid GPIO 6–11 (flash); GPIO 34–39 are input-only; GPIO 0, 2, 5, 12, 15 are strapping pins.\nArduino Uno: D0/D1 are UART; D3, D5, D6, D9, D10, D11 support PWM; A4/A5 are I²C.'
  }]
}

export default plugin
