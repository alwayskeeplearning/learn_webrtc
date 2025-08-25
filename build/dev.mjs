import { defineConfig } from '@rspack/cli';
import ReactRefreshPlugin from '@rspack/plugin-react-refresh';
import { merge } from 'webpack-merge';
import base from './base.mjs';
import { DevServer } from './config.mjs';


const dev = defineConfig({
  mode: 'development',
  devtool: 'source-map',
  devServer: DevServer,
  plugins: [
    new ReactRefreshPlugin(),
  ],
  optimization: {
    moduleIds: 'named',
    chunkIds: 'named',
    minimize: false,
  },
  
});

export default merge(base, dev);
