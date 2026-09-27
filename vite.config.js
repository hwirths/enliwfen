import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig
({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'lib/main.js'),
      name: 'enliwfen',
      // the proper extensions will be added
      fileName: 'enliwfen',
    },
  }
})