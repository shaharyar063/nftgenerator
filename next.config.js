const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
    webpack: (config, { isServer }) => {
      // Basic fallbacks for all environments
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer/'),
        stream: require.resolve('stream-browserify'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        path: require.resolve('path-browserify'),
      };

      // Client-side specific fallbacks
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
        };

        config.plugins = [
          ...(config.plugins || []),
          new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
          }),
        ];
      }

      return config;
    },
  };
  
  module.exports = nextConfig;