import { CavalloPlugin, CavalloBoardDefinition } from '../../packages/plugin-api/src/index.js';

const rpiPlugin: CavalloPlugin = {
  activate(context) {
    console.log('Raspberry Pi extension activated');
  },
  deactivate() {
    console.log('Raspberry Pi extension deactivated');
  },
  registerBoard(): CavalloBoardDefinition[] {
    return [
      {
        id: 'pico',
        name: 'Raspberry Pi Pico',
        vendor: 'Raspberry Pi Foundation',
        architecture: 'rp2040',
        defaultBaudRate: 115200
      }
    ];
  }
};

export default rpiPlugin;
