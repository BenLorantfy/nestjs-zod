import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/dto.ts'],
  format: ['cjs', 'esm'],
  dts: true,
})
