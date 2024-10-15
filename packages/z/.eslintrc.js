const { configure, presets } = require('eslint-kit')

module.exports = configure({
  presets: [
    presets.imports(),
    presets.node(),
    presets.prettier(),
    presets.typescript(),
  ],
  extend: {
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
})
