const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable package exports for socket.io-client and engine.io-client to work
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'browser', 'react-native'];

// Add extensions to ensure Metro can resolve them
config.resolver.sourceExts.push('cjs', 'mjs');

module.exports = config;
