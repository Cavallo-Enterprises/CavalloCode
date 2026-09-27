import type { CavalloPlugin } from '../../../packages/plugin-api/src/index'

const plugin: CavalloPlugin = {
  activate() {},
  deactivate() {},
  registerThemes: () => [{ id: 'cavallo-ocean', name: 'Cavallo Ocean' }]
}

export default plugin
