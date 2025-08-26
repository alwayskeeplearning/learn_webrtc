import { WebSocketServer } from 'ws';
import https from 'https';
import fs from 'fs';
import path from 'path';

// 读取自签名证书
const key = fs.readFileSync(path.join(process.cwd(), 'signaling-server/key.pem'));
const cert = fs.readFileSync(path.join(process.cwd(), 'signaling-server/cert.pem'));

// 创建一个 HTTPS 服务器
const httpsServer = https.createServer({ key, cert });

// 将 WebSocket 服务器附加到 HTTPS 服务器上
const wss = new WebSocketServer({ server: httpsServer });

console.log('信令服务器准备就绪...');

// 监听连接事件
wss.on('connection', ws => {
  console.log('一个新的客户端已连接');

  // 监听来自客户端的消息
  ws.on('message', message => {
    console.log('收到消息 => %s', message);

    // 广播消息给所有其他客户端
    wss.clients.forEach(client => {
      // 检查客户端是否是发送方，并且连接是否仍然打开
      if (client !== ws && client.readyState === 1) {
        // 1 表示 WebSocket.OPEN
        client.send(message.toString());
      }
    });
  });

  // 监听连接关闭事件
  ws.on('close', () => {
    console.log('一个客户端已断开连接');
  });

  // 监听错误事件
  ws.on('error', error => {
    console.error('WebSocket 发生错误:', error);
  });
});

// 定义端口
const PORT = 8080;

// 启动 HTTPS 服务器，并监听在 0.0.0.0 以允许内网访问
httpsServer.listen(PORT, '0.0.0.0', () => {
  console.log(`安全的信令服务器 (WSS) 已启动，正在监听 0.0.0.0:${PORT}`);
});
