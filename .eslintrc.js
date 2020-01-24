module.exports = {
  env: {
    node: true
  },
  extends: [
    'eslint:recommended',
    'airbnb-base'
  ],
  parserOptions: {
    ecmaVersion: 6
  },
  rules: {
    'no-console': 'off'
  }
}
