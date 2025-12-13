import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import bundleSize from 'rollup-plugin-bundle-size'

const src = (file) => `src/${file}`
const dist = (file) => `dist/${file}`
const root = (file) => `${file}`

const bundle = (input, config) =>
  defineConfig({
    ...config,
    input,
    external: (id) => !/^[./]/.test(id),
    plugins: [
      ...(config.plugins || []),
      bundleSize()
    ]
  })

const config = defineConfig([
  bundle(src('index.ts'), {
    plugins: [esbuild()],
    output: [
      {
        file: dist('index.mjs'),
        format: 'es',
      },
      {
        file: dist('index.js'),
        format: 'cjs',
      },
    ],
  }),
  bundle(src('index.ts'), {
    plugins: [dts()],
    output: [
      {
        file: dist('index.d.ts'),
        format: 'es',
      },
    ],
  }),
  bundle(src('dto.ts'), {
    plugins: [esbuild()],
    output: [
      {
        file: dist('dto.mjs'),
        format: 'es',
      },
      {
        file: dist('dto.js'),
        format: 'cjs',
      },
    ],
  }),
  bundle(src('dto.ts'), {
    plugins: [dts()],
    output: [
      {
        file: root('dto.d.ts'),
        format: 'es',
      },
      {
        file: dist('dto.d.ts'),
        format: 'es',
      },
    ],
  }),
])

export default config
