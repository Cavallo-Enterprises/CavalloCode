import { CavalloPlugin, CavalloBoardDefinition } from '../../packages/plugin-api/src/index.js';

const esp32Plugin: CavalloPlugin = {
  activate(context) {
    console.log('ESP32 extension activated');
  },
  deactivate() {
    console.log('ESP32 extension deactivated');
  },
  registerBoard(): CavalloBoardDefinition[] {
    return [
      {
        id: 'esp32dev',
        name: 'ESP32 Dev Module',
        vendor: 'Espressif',
        architecture: 'esp32',
        defaultBaudRate: 115200
      }
    ];
  }
};

export default esp32Plugin;
