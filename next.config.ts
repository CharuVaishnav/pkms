import { NextConfig } from 'next';
import webpack from 'webpack';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Inject node polyfill layer smoothly
    config.plugins.push(new NodePolyfillPlugin());
    
    // Explicitly bind the Buffer global variable plugin macro
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    );

    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: require.resolve('buffer/'),
    };

    return config;
  },
};

export default nextConfig;