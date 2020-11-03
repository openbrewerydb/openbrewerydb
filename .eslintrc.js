module.exports = {
  env: {
    node: true,
    es6: true,
  },
  extends: ["eslint:recommended", "airbnb-base"],
  parserOptions: {
    ecmaVersion: 8,
  },
  rules: {
    "no-console": "off",
  },
};
