import { defineConfig } from '@rspack/cli';
// import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import { rspack } from '@rspack/core';
import { isProd, resolve, subDir, getCSSModuleRules } from './helper.mjs';
import { ENV, Polyfill } from './config.mjs';

const { HtmlRspackPlugin, CopyRspackPlugin, DefinePlugin } = rspack;

const base = defineConfig({
  target: 'web',
  entry: {
    index: resolve('./src/index.ts'),
  },
  output: {
    clean: true,
    path: resolve(ENV[process.env.NODE_ENV].PATH),
    publicPath: ENV[process.env.NODE_ENV].PUBLIC_PATH,
    filename: '[name].js',
  },
  resolve: {
    alias: {
      '@': resolve('./src'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.glsl'],
  },
  experiments: {
    css: true,
  },
  module: {
    parser: {
      'css/module': {
        namedExports: false,
      },
    },
    rules: [
      {
        test: /\.js[x]?$/,
        include: [resolve('./src')],
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              sourceMap: !isProd,
              jsc: {
                parser: {
                  syntax: 'ecmascript',
                  jsx: true,
                },
                transform: {
                  react: {
                    pragma: 'React.createElement',
                    pragmaFrag: 'React.Fragment',
                    runtime: 'automatic',
                    development: !isProd,
                    refresh: !isProd,
                  },
                },
              },
              env: Polyfill,
            },
          },
        ],
      },
      {
        test: /\.ts[x]?$/,
        include: [resolve('./src')],
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              sourceMap: !isProd,
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    pragma: 'React.createElement',
                    pragmaFrag: 'React.Fragment',
                    runtime: 'automatic',
                    development: !isProd,
                    refresh: !isProd,
                  },
                },
              },
              env: Polyfill,
              rspackExperiments: {
                import: [
                  {
                    libraryName: 'antd',
                    style: true,
                  },
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|webp)$/,
        type: 'asset',
      },
      {
        test: /\.svg$/,
        include: [resolve('./src')],
        use: [
          {
            loader: 'svg-sprite-loader',
            options: {
              symbolId: 'icon-[name]',
            },
          },
        ],
      },
      {
        test: /\.(woff2?|ttf|eot)(\?.*)?$/,
        type: 'asset/resource',
        generator: {
          filename: subDir('fonts/[name].[hash:8][ext]'),
        },
      },
      ...getCSSModuleRules(),
    ],
  },
  plugins: [
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.TIME_OUT': JSON.stringify(ENV[process.env.NODE_ENV].REQUEST_TIMEOUT),
      'process.env.API_PATH': JSON.stringify(ENV[process.env.NODE_ENV].API_BASE_URL),
      'process.env.SUB_DIR': JSON.stringify(ENV[process.env.NODE_ENV].SUB_DIR),
      'process.env.PUBLIC_PATH': JSON.stringify(ENV[process.env.NODE_ENV].PUBLIC_PATH),
    }),
    new CopyRspackPlugin({
      patterns: [
        {
          from: resolve('/src/public'),
          to: subDir('/'),
        },
      ],
    }),
    new HtmlRspackPlugin({
      template: resolve(`/index.html`),
      filename: `index.html`,
      minify: true,
    }),
    //  new ModuleFederationPlugin({
    //   name: 'federation_consumer',
    //   remotes: {
    //     federation_provider:
    //       'federation_provider@/federation_provider/remoteEntry.js',
    //   },
    //   shared: {
    //     react: { singleton: true },
    //     'react-dom': { singleton: true },
    //   },
    // }),
  ],
});

export default base;
