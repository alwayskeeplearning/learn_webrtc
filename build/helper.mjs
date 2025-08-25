import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV, Targets } from './config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

const resolve = dir => {
  return join(__dirname, '..', dir);
};

const subDir = dir => {
  return join(ENV[process.env.NODE_ENV].SUB_DIR, dir);
};

const getCSSModuleRules = () => {
  const sourceMap = isProd;
  const cssLoader = {
    loader: 'builtin:lightningcss-loader',
    options: {
      targets: Targets,
      sourceMap,
    },
  };

  const cssModuleLoader = {
    loader: 'builtin:lightningcss-loader',
    options: {
      targets: Targets,
      sourceMap,
      cssModules: {
        pattern: '[hash]-[local]',
      },
    },
  };

  const lessLoader = {
    loader: 'less-loader',
    options: {
      sourceMap,
    },
  };

  const cssNodeModuleRule = {
    test: /\.css$/,
    use: [cssLoader],
    include: [resolve('./node_modules')],
    type: 'css',
  };

  const cssRule = {
    test: /\.global\.css$/,
    use: [cssLoader],
    include: [resolve('./src')],
    type: 'css',
  };

  const cssModuleRule = {
    test: /^(?!.*\.global).*\.css$/,
    use: [cssModuleLoader],
    include: [resolve('./src')],
    type: 'css/module',
  };

  const lessNodeModuleRule = {
    test: /\.less$/,
    use: [cssLoader, lessLoader],
    include: [resolve('./node_modules')],
    type: 'css',
  };

  const lessRule = {
    test: /\.global\.less$/,
    use: [cssLoader, lessLoader],
    include: [resolve('./src')],
    type: 'css',
  };

  const lessModuleRule = {
    test: /^(?!.*\.global).*\.less$/,
    use: [cssModuleLoader, lessLoader],
    include: [resolve('./src')],
    type: 'css/module',
  };

  return [cssNodeModuleRule, cssRule, cssModuleRule, lessNodeModuleRule,lessRule, lessModuleRule];
};

export { isProd, resolve, subDir, getCSSModuleRules };
