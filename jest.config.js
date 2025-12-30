module.exports = {
  testEnvironment: "node",
  collectCoverageFrom: [
    "services/**/*.js",
    "routes/**/*.js",
    "middleware/**/*.js",
    "utils/**/*.js",
    "app.js",
    "!**/node_modules/**",
  ],
  testMatch: ["**/test/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
  testTimeout: 10000,
};
