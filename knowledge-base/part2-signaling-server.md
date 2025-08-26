# Part 2: 实现信令服务器

## 步骤 2.1: 讲解信令的用途和原理

### 理论知识

在 WebRTC 中，**信令 (Signaling)** 是在建立对等连接 (Peer-to-Peer) 之前，用于协调沟通、交换元数据的过程。这个过程是 WebRTC 的基础，但 WebRTC API 本身**并未规定或实现**信令。开发者需要自行构建信令机制。

信令服务器，作为通信双方的“中间人”或“介绍人”，负责传递建立连接所需的核心信息。

### 信令交换的三类核心信息

1.  **会话控制信息 (Session Control)**:

    - **作用**: 管理通话的整个生命周期，如发起、应答、拒绝或结束通话。
    - **示例**: 用户A向用户B发送“请求通话”消息，用户B回复“同意通话”或“拒绝通话”，通话结束后任何一方发送“挂断”消息。

2.  **网络配置信息 (ICE Candidates)**:

    - **作用**: 交换双方的网络地址信息（IP地址和端口）。由于 NAT (网络地址转换) 的存在，设备通常没有公共 IP 地址。WebRTC 使用 ICE (Interactive Connectivity Establishment) 协议来发现所有可能的网络路径（包括本地局域网地址、通过 STUN 服务器发现的公网地址等），并从中选择最佳路径建立连接。这些发现的路径候选者就是 ICE Candidates，需要通过信令服务器进行交换。

3.  **媒体能力信息 (SDP - Session Description Protocol)**:
    - **作用**: 协商双方的媒体参数，确保双方能够正确编解码对方的音视频流。
    - **内容**: SDP 描述了媒体的详细信息，例如：
      - 视频编解码器 (如 H.264, VP9)
      - 音频编解码器 (如 Opus, AAC)
      - 分辨率、帧率
      - 加密参数等
    - **流程**: 通话发起方创建一个 "Offer" (提议) SDP，包含自己的媒体能力；接收方收到后，创建一个 "Answer" (应答) SDP，包含双方共同支持的媒体能力。这个 Offer/Answer 的交换过程也由信令服务器完成。

### 为什么选择 WebSocket 作为信令技术？

信令交换要求通信具有**低延迟**和**双向实时性**。

- 传统的 HTTP 请求-响应模式不适合，因为它是一种无状态的短连接，客户端需要通过轮询（不断发送请求）来检查是否有新消息，这会导致延迟高、服务器资源浪费。
- **WebSocket** 提供了浏览器与服务器之间的**全双工、持久性连接**。一旦连接建立，任何一方都可以随时向对方主动推送消息，完美满足了信令交换的需求。

### 常见问题与解答

**问题**: 是不是一旦 P2P 连接成功，就不再需要信令服务器了？

**解答**: 这个理解基本正确，但不完全准确。

- **正确的部分**: 核心的音视频数据流 (MediaStream) 在 P2P 连接建立后，会直接在两个浏览器之间传输，**完全不经过信令服务器**。这是 WebRTC 高效、低延迟的核心优势。

- **需要补充的部分**: 尽管核心数据不走信令服务器，但**信令通道 (WebSocket 连接) 通常会保持**，直到通话完全结束。原因如下：
  1.  **通话控制 (Call Control)**: 像“挂断”、“静音/取消静音”等操作，仍然需要通过信令服务器通知对方。
  2.  **连接状态维护**: 保持连接可以作为一种“心跳”机制，用于判断对方是否仍然在线。如果 WebSocket 意外断开，就可以认为对方掉线了。
  3.  **重新协商 (Re-negotiation)**: 在通话过程中，如果网络环境变化（如从 WiFi 切换到 4G），可能需要交换新的 ICE Candidate 来优化连接。或者，如果通话媒体发生变化（如从音频通话升级为视频通话），需要交换新的 SDP。这些后续的协商仍然依赖信令服务器。

**总结**: 信令服务器是 WebRTC 的“红娘”，负责撮合双方。一旦双方牵手成功（P2P 连接建立），“红娘”就退居幕后，但会留着联系方式，以备不时之需（如管理通话状态、处理变化）。

---

## 步骤 2.2: 搭建 Node.js + WebSocket 信令服务器

### 核心 API 讲解 (Node.js `ws` 库)

我们使用 `ws` 库来搭建服务器。

1.  **`new WebSocket.Server({ port: ... })`**: 创建一个新的 WebSocket 服务器实例并监听指定端口。
2.  **`wss.on('connection', (ws) => { ... })`**: 监听客户端连接事件。每当有新客户端连接，回调函数就会执行，参数 `ws` 代表该客户端的连接实例。
3.  **`ws.on('message', (message) => { ... })`**: 监听特定客户端 `ws` 发来的消息。
4.  **`ws.send(data)`**: 向特定客户端 `ws` 发送消息。
5.  **广播消息**: 通过遍历 `wss.clients` 集合，可以向所有（或部分）客户端发送消息。通常需要排除消息的发送方本身。

### 代码实现

1.  **安装依赖**:

    ```bash
    # 使用 pnpm
    pnpm add ws
    # 或使用 npm
    npm install ws
    ```

2.  **服务器代码 (`signaling-server/index.mjs`)**:

    ```javascript
    import { WebSocketServer } from 'ws';

    // 在 8080 端口上创建一个 WebSocket 服务器
    const wss = new WebSocketServer({ port: 8080 });

    console.log('信令服务器已启动，正在监听 8080 端口...');

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
        console.error('发生错误:', error);
      });
    });
    ```

3.  **添加启动脚本 (package.json)**:
    在 `scripts` 对象中添加 `"signal": "node signaling-server/index.mjs"`。

### 验证与测试

在项目根目录下运行 `pnpm signal` 或 `npm run signal`，看到 "信令服务器已启动..." 即表示成功。

---

## 步骤 2.3: 实现客户端与信令服务器的连接

### 核心 API 讲解 (浏览器 `WebSocket` API)

浏览器原生提供了 `WebSocket` 对象来处理客户端连接。

1.  **`const socket = new WebSocket('ws://localhost:8080');`**: 创建实例并尝试连接到服务器。
2.  **`socket.onopen`**: 连接成功建立时触发。
3.  **`socket.onmessage`**: 收到服务器消息时触发，数据在 `event.data` 中。
4.  **`socket.send(data)`**: 向服务器发送数据。
5.  **`socket.onclose`**: 连接关闭时触发。
6.  **`socket.onerror`**: 连接发生错误时触发。

### 代码实现 (`src/app.tsx`)

我们使用 React 的 `useEffect` Hook 来管理 WebSocket 连接的生命周期。

```typescript
// ... 其他代码 ...
import { useEffect, useRef, useState } from 'react';

const App = () => {
  // ... 其他 Refs 和 State ...

  // --- WebSocket 连接逻辑 ---
  useEffect(() => {
    // 步骤 2.3: 连接信令服务器
    const socket = new WebSocket('ws://localhost:8080');

    // 监听连接成功事件
    socket.onopen = () => {
      console.log('成功连接到信令服务器');
    };

    // 监听来自服务器的消息
    socket.onmessage = event => {
      console.log('收到服务器消息:', event.data);
      // 在后续步骤中，我们将在这里处理 SDP 和 ICE Candidate
    };

    // 监听连接关闭事件
    socket.onclose = () => {
      console.log('与信令服务器的连接已关闭');
    };

    // 监听错误事件
    socket.onerror = error => {
      console.error('WebSocket 发生错误:', error);
    };

    // 在组件卸载时，清理 WebSocket 连接
    return () => {
      socket.close();
    };
  }, []); // 空依赖数组意味着这个 effect 只会在组件挂载时运行一次

  // ... 其他函数和 JSX ...
};

export default App;
```

### 验证与测试

1.  保持信令服务器和前端开发服务器运行。
2.  打开**两个**浏览器标签页访问应用。
3.  检查浏览器控制台，应看到 "成功连接到信令服务器"。
4.  检查信令服务器终端，应看到两条 "一个新的客户端已连接" 的日志。
