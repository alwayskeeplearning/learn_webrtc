// import { rspack } from '@rspack/core';
import { defineConfig } from '@rspack/cli';
// import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { merge } from 'webpack-merge';
import base from './base.mjs';
import { subDir } from './helper.mjs';
import { BUILD_ANALYZER } from './config.mjs';

// const { SwcJsMinimizerRspackPlugin, LightningCssMinimizerRspackPlugin } = rspack;

const prod = defineConfig({
  mode: 'production',
  devtool: false,
  output: {
    filename: subDir('js/[name].[contenthash:8].js'),
    chunkFilename: subDir('js/[name].[contenthash:8].js'),
  },
  optimization: {
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    minimize: true,
    // minimizer: [
    //   new SwcJsMinimizerRspackPlugin({
    //     minimizerOptions: {},
    //   }),
    //   new LightningCssMinimizerRspackPlugin({
    //     minimizerOptions: {
    //       errorRecovery: false,
    //     },
    //   }),
    // ],
    splitChunks: {
      cacheGroups: {
        common: {
          name: 'common',
          chunks: 'async',
          test: /[\\/]src[\\/]/,
          minChunks: 2,
          minSize: 30000,
          priority: -10,
          reuseExistingChunk: true,
        },
        vendor: {
          name: 'vendor',
          test: /[\\/]node_modules[\\/]/,
          chunks: 'all',
          priority: 10,
        },
        ui: {
          name: 'ui',
          test: /[\\/]node_modules[\\/](antd|@ant-design|rc-.*|tinycolor2|async-validator)/,
          chunks: 'all',
          priority: 20,
          reuseExistingChunk: true,
        },
      },
    },
  },
  plugins: [],
});

if (BUILD_ANALYZER) {
  prod.plugins.push(
    new BundleAnalyzerPlugin({
      analyzerPort: 8899,
    }),
  );
  // prod.plugins.push(new RsdoctorRspackPlugin({}));
}

export default merge(base, prod);
