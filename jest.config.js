module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  testMatch: ['**/tests/**/*.test.[jt]s']
};
