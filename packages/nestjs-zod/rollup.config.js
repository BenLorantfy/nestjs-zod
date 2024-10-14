import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import { terser } from 'rollup-plugin-terser'
import bundleSize from 'rollup-plugin-bundle-size'
import copy from 'rollup-plugin-copy'

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
  bundle(src('z/exports/everything.ts'), {
    plugins: [esbuild()],
    output: [
      {
        file: dist('z.js'),
        format: 'cjs',
      },
      {
        file: dist('z.mjs'),
        format: 'es',
      },
    ],
  }),
  bundle(src('z/exports/only-override.ts'), {
    plugins: [
      dts(),
      copy({
        targets: [
          {
            src: './z.d.ts',
            dest: 'dist',
            transform: (contents) => contents.toString().replaceAll('./dist', '.'),
          }
        ],
      }),
    ],
    output: [
      {
        file: dist('z-only-override.d.ts'),
        format: 'es',
      },
    ],
  }),
  bundle(src('frontend/index.ts'), {
    plugins: [esbuild(), terser()],
    output: [
      {
        file: dist('frontend.mjs'),
        format: 'es',
      },
      {
        file: dist('frontend.js'),
        format: 'cjs',
      },
    ],
  }),
  bundle(src('frontend/index.ts'), {
    plugins: [dts()],
    output: [
      {
        file: root('frontend.d.ts'),
        format: 'es',
      },
      {
        file: dist('frontend.d.ts'),
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
