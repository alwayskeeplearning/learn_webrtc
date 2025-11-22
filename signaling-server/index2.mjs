import https from 'https';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';

// 读取自签名证书
const key = fs.readFileSync(path.join(process.cwd(), 'signaling-server/key.pem'));
const cert = fs.readFileSync(path.join(process.cwd(), 'signaling-server/cert.pem'));

// 创建一个 HTTPS 服务器
const httpsServer = https.createServer({ key, cert });

// 将 WebSocket 服务器附加到 HTTPS 服务器上
const wss = new Server(httpsServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'],
});

const roomMap = new Map();

const getParams = (url, queryName) => {
  const urlObj = new URL(url, 'https://localhost');
  return urlObj.searchParams.get(queryName);
};

const broadcastMessage = (roomId, message) => {
  const userMap = roomMap.get(roomId);
  userMap.forEach(({ socket }) => {
    socket.emit('message', message);
  });
};

const generateMessage = (type, msg, status = 200, data = null) => {
  return {
    type,
    msg,
    status,
    data,
  };
};

const sendMsgToUser = (roomId, userId, message) => {
  const userMap = roomMap.get(roomId);
  if (userMap && userMap.has(userId)) {
    const socket = userMap.get(userId).socket;
    socket.emit('message', message);
    return true;
  }
  console.log(`用户${userId}不在房间${roomId}`);
  return false;
};

const wssEventListener = async socket => {
  const url = socket.client.request.url;
  const userId = getParams(url, 'userId');
  const roomId = getParams(url, 'roomId');
  console.log(`用户${userId}加入房间${roomId}`);
  if (!roomMap.has(roomId)) {
    roomMap.set(roomId, new Map());
  }
  const userMap = roomMap.get(roomId);
  userMap.set(userId, {
    socket,
    userId,
    roomId,
  });
  broadcastMessage(roomId, generateMessage('join', `用户${userId}加入房间${roomId}`, 200, { userId, roomId }));

  socket.on('message', data => {
    console.log('msg', data);
    broadcastMessage(roomId, data);
  });

  socket.on('disconnect', () => {
    console.log(`用户${userId}离开房间${roomId}`);
    const userMap = roomMap.get(roomId);
    if (userMap && userMap.has(userId)) {
      userMap.delete(userId);
      broadcastMessage(roomId, generateMessage('leave', `用户${userId}离开房间${roomId}`));
    }
  });

  socket.on('roomUserList', data => {
    const userMap = roomMap.get(data['roomId']);
    const userList = Array.from(userMap.values()).map(user => user.userId);
    socket.emit('roomUserList', userList);
  });

  socket.on('call', data => {
    const targetUserId = data['targetUserId'];
    const roomId = data['roomId'];
    const userMap = roomMap.get(roomId);
    if (userMap.has(targetUserId)) {
      sendMsgToUser(roomId, targetUserId, generateMessage('call', `用户${userId}呼叫用户${targetUserId}`));
    } else {
      console.log(`call 用户${targetUserId}不在房间${roomId}`);
    }
  });

  socket.on('candidate', data => {
    const targetUserId = data['targetUserId'];
    const roomId = data['roomId'];
    const userMap = roomMap.get(roomId);
    if (userMap.has(targetUserId)) {
      sendMsgToUser(roomId, targetUserId, generateMessage('candidate', `用户${userId}发送候选信息给用户${targetUserId}`));
    } else {
      console.log(`candidate 用户${targetUserId}不在房间${roomId}`);
    }
  });

  socket.on('offer', data => {
    const targetUserId = data['targetUserId'];
    const roomId = data['roomId'];
    const userMap = roomMap.get(roomId);
    if (userMap.has(targetUserId)) {
      sendMsgToUser(roomId, targetUserId, generateMessage('offer', `用户${userId}发送offer信息给用户${targetUserId}`));
    } else {
      console.log(`offer 用户${targetUserId}不在房间${roomId}`);
    }
  });

  socket.on('answer', data => {
    const targetUserId = data['targetUserId'];
    const roomId = data['roomId'];
    const userMap = roomMap.get(roomId);
    if (userMap.has(targetUserId)) {
      sendMsgToUser(roomId, targetUserId, generateMessage('answer', `用户${userId}发送answer信息给用户${targetUserId}`));
    } else {
      console.log(`answer 用户${targetUserId}不在房间${roomId}`);
    }
  });
};
// 监听连接事件
wss.on('connection', async socket => {
  try {
    await wssEventListener(socket);
  } catch (error) {
    console.error('wssEventListener error', error);
    socket.disconnect();
  }
});

// httpsServer.on('request', (req, res) => {
//   if (req.url?.startsWith('/socket.io/')) return; // 让 socket.io 自己处理
//   res.end('Hello World');
// });
// 定义端口
const PORT = 8080;

// 启动 HTTPS 服务器，并监听在 0.0.0.0 以允许内网访问
httpsServer.listen(PORT, '0.0.0.0', () => {
  console.log(`安全的信令服务器 (WSS) 已启动，正在监听 0.0.0.0:${PORT}`);
});
