// eslint.config.mjs
import oclifConfig from 'eslint-config-oclif'
import prettierConfig from 'eslint-config-prettier'
import pluginChaiFriendly from 'eslint-plugin-chai-friendly'

export default [
  // Spread in the imported shareable configurations.
  // These packages should export either a configuration object or an array of objects.
  pluginChaiFriendly.configs.recommendedFlat,
  ...oclifConfig,
  prettierConfig,

  // Your custom configuration:
  {
    // Apply to all files:
    files: ['**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off', // disable original rule
      'chai-friendly/no-unused-expressions': 'error',
    },
  },

  // Instead of an .eslintignore file, use the `ignores` property.
  {
    ignores: ['dist'],
  },
]
