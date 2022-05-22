const { configure, presets } = require('eslint-kit')

module.exports = configure({
  presets: [presets.node(), presets.typescript(), presets.prettier()],
})
