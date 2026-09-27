import type { CavalloPlugin } from '../../../packages/plugin-api/src/index'

const plugin: CavalloPlugin = {
  activate() {},
  deactivate() {},
  registerCommands: () => [{
    id: 'builtin.firmware-checklist',
    title: 'Show firmware release checklist',
    description: 'Checklist for a safe embedded firmware upload.',
    execute: () => 'Firmware checklist:\n1. Confirm board and serial port.\n2. Check pin voltage limits and power budget.\n3. Compile and resolve warnings.\n4. Upload with the board powered safely.\n5. Verify startup and serial diagnostics.'
  }]
}

export default plugin
