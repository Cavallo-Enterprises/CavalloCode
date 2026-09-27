import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // SerialPort loads a platform-specific native addon through node-gyp-build.
  // Keep it and its binding package external so resolution starts from the
  // installed package directory rather than the bundled main entry point.
  main: {
    build: {
      rollupOptions: {
        external: ['serialport', '@serialport/bindings-cpp']
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
