import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import { terser } from 'rollup-plugin-terser'
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
    plugins: [esbuild(), terser()],
    output: [
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
  bundle(src('nz/index.ts'), {
    plugins: [esbuild(), terser()],
    output: [
      {
        file: dist('nz.js'),
        format: 'cjs',
      },
    ],
  }),
  bundle(src('nz/index.ts'), {
    plugins: [dts()],
    output: [
      {
        file: root('nz.d.ts'),
        format: 'es',
      },
    ],
  }),
])

export default config
