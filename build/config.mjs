const Targets = ['chrome >= 49', 'edge >= 88'];

const Polyfill = {
    mode: 'usage',
    coreJs: '3.39.0',
    targets:Targets,
  };

const DevServer = {
    client: {
      logging: 'info',
      overlay: true,
      progress: true,
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    historyApiFallback: {
      disableDotRule: true,
    },
    host: 'local-ip',
    hot: true,
    open: true,
    port: 2333,
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3000',
        // pathRewrite: { '^/api': '' },
      },
      {
        context: ['/federation_provider'],
        target: 'http://localhost:2333',
        changeOrigin: true,
      },
    ],
  };

const ENV = {
  development: {
    API_BASE_URL: '/api',
    REQUEST_TIMEOUT: 1000 * 120, // 120s
    SUB_DIR: 'static',
    PATH: 'dist',
    PUBLIC_PATH: '/',
  },
  production: {
    API_BASE_URL: '/api',
    REQUEST_TIMEOUT: 1000 * 120, // 120s
    SUB_DIR: 'static',
    PATH: 'dist',
    PUBLIC_PATH: '',
  },
};

const BUILD_ANALYZER = false;

const Preview_PORT = 8081;

export {Targets,Polyfill,DevServer, ENV, BUILD_ANALYZER,Preview_PORT };
