const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['@tanstack/react-query'],
  },
  turbopack: {
    root: path.join(__dirname, '..', '..'),
    resolveAlias: {
      '@metamask/sdk': path.join(__dirname, 'src', 'lib', 'empty.ts'),
      '@react-native-async-storage/async-storage': path.join(__dirname, 'src', 'lib', 'empty.ts'),
      'pino-pretty': path.join(__dirname, 'src', 'lib', 'empty.ts'),
    },
  },
};

module.exports = nextConfig;
