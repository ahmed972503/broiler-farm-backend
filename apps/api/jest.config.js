module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 60000,
  roots: ["<rootDir>/src"],
  globalSetup: "<rootDir>/src/__tests__/globalSetup.ts",
  globalTeardown: "<rootDir>/src/__tests__/globalTeardown.ts",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@broiler/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
  collectCoverageFrom: [
    "src/controllers/**/*.ts",
    "src/services/**/*.ts",
    "src/middleware/**/*.ts",
    "src/routes/**/*.ts",
  ],
};
