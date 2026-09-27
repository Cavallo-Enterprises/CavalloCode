import type { CavalloPlugin, CavalloBoardDefinition } from '../../../packages/plugin-api/src/index';

const arduinoPlugin: CavalloPlugin = {
  activate() {
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
