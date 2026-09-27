import type { CavalloPlugin } from '../../../packages/plugin-api/src/index'

const plugin: CavalloPlugin = {
  activate() {},
  deactivate() {},
  registerThemes: () => [{ id: 'cavallo-forest', name: 'Cavallo Forest' }]
}

export default plugin
