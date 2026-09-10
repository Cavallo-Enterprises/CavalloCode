import { CavalloPlugin, CavalloBoardDefinition } from '../../packages/plugin-api/src/index.js';

const arduinoPlugin: CavalloPlugin = {
  activate(context) {
    console.log('Arduino extension activated');
  },
  deactivate() {
    console.log('Arduino extension deactivated');
  },
  registerBoard(): CavalloBoardDefinition[] {
    return [
      {
        id: 'uno',
        name: 'Arduino Uno',
        vendor: 'Arduino',
        architecture: 'avr',
        defaultBaudRate: 115200
      }
    ];
  }
};

export default arduinoPlugin;
