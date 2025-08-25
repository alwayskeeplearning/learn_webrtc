import { resolve } from 'path';
import fs from 'fs';
import { promisify } from 'util';
import Koa from 'koa';
import serve from 'koa-static';
import mount from 'koa-mount';
import { createProxyMiddleware } from 'koa-http-proxy-server';
import chalk from 'chalk';
import { DevServer, ENV, Preview_PORT } from './config.mjs';

const readFile = promisify(fs.readFile);

const createProxies = (app, proxy) => {
  if (typeof proxy !== 'object') {
    return;
  }
  Object.entries(proxy).forEach(([k, v]) => {
    app.use(createProxyMiddleware(k, v));
  });
};

const startServer = options => {
  const randomPort = Math.round(Math.random() * 10000 + 10000);
  const {
    configDir = './',
    devServer: { proxy = {} },
    preview: { port = randomPort } = {},
    path: { distPath = './dist' } = {},
  } = options;

  const app = new Koa();

  createProxies(app, proxy);
  console.log(resolve(configDir, distPath));
  app.use(mount('/', serve(resolve(configDir, distPath))));

  app.use(async ctx => {
    const indexHtml = await readFile(`${resolve(configDir, distPath)}/index.html`);
    ctx.set('Content-Type', 'text/html; charset=utf-8');
    ctx.body = indexHtml.toString();
  });

  app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(chalk.green(`preview server started on ${url}`));
  });
};
console.log('rocess.env.NODE_ENV]',process.env.NODE_ENV);

startServer({
  devServer: DevServer,
  preview: {
    port: Preview_PORT,
  },
  path: {
    distPath: ENV[process.env.NODE_ENV].PATH,
  },  
});
