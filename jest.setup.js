/* global jest */

// Mock @react-native-async-storage/async-storage with the official in-memory mock
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Silence noisy act() / renderer warnings
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('act(') || args[0].includes('ReactDOM.render'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};
