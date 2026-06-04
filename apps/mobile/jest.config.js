/** Jest 설정 — 라이브러리 미설치 환경에서도 안전하게 통과 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo|@unimodules|unimodules|sentry-expo|native-base|react-clone-referenced-element|@tanstack)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
