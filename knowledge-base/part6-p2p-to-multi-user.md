# Part 6: 扩展与进阶：从 P2P 到多人通话

## 步骤 6.1: P2P 架构的优缺点及其在多人通话中的局限性

### 1. P2P (Peer-to-Peer) 架构回顾

在 P2P 模式下，两个浏览器通过信令服务器交换信息后，建立一条直接的点对点媒体流通道。数据不经过中间服务器。

**优点:**

- **低延迟 (Low Latency):** 数据传输路径最短。
- **保护隐私 (Privacy):** 媒体数据端到端加密，不经过第三方服务器。
- **成本效益 (Cost-Effective):** 媒体流量不消耗服务器带宽。

### 2. P2P 架构在多人通话中的局限性

在多人（N > 4）通话中，通常采用“**网状网络 (Mesh Network)**”拓扑，即每个参会者与其他所有人都建立独立的 P2P 连接。

**缺点:**

1.  **高昂的上行带宽消耗 (High Uplink Bandwidth Consumption):** 每个参会者需要 `N-1` 倍的上行带宽来向其他所有人发送媒体流。
2.  **CPU/内存资源消耗巨大 (High CPU/Memory Usage):** 设备需要为 `N-1` 个连接进行独立的媒体流加密、编码和打包，负载极高。
3.  **连接建立复杂且不稳定 (Complex and Unstable Connections):** 需要建立 `N * (N-1) / 2` 个连接，连接数越多，失败概率越大。

---

### **学员提问与解答 (Q&A)**

#### **Q: WebRTC 必须建立在 HTTPS 下吗？只用数据通道也需要吗？**

**A:** 是的，**线上部署时必须使用 HTTPS**，即使只用 `RTCDataChannel`。主要原因有二：

1.  **安全上下文 (Secure Context)**: 浏览器规定，像 `getUserMedia` (访问摄像头/麦克风) 和 `RTCPeerConnection` 这样强大的 API，只能在安全上下文（如 `https://` 或 `localhost`）中被调用。在 `http://` 页面上，这些 API 会被浏览器直接禁用。
2.  **信令安全**: `https://` 页面强制要求使用安全的 WebSocket (`wss://`) 连接，以防止混合内容错误。

**规则**: **本地开发用 `http://localhost`，线上部署必须用 `https://`**。

---

## 步骤 6.2: 服务器中继架构：MCU 与 SFU

为了解决 P2P 的扩展性问题，引入了中心化的媒体服务器，形成“**星形网络 (Star Network)**”拓扑。每个客户端只连接到中心服务器。

### 1. MCU (Multipoint Control Unit - 多点控制单元)

- **工作原理**: **混合 (Mixing)**。MCU 接收所有人的流，在**服务器端**将它们解码、混合成**一路合成的音视频流**，再编码后发给每个参会者。
- **优点**: 客户端极其轻量（永远是 1 收 1 发），兼容性好。
- **缺点**: 服务器成本高昂（需要大量 CPU 进行编解码），延迟较高，灵活性差（无法自定义布局）。

### 2. SFU (Selective Forwarding Unit - 选择性转发单元)

- **工作原理**: **转发 (Forwarding)**。SFU 接收所有人的流，**不进行编解码**，而是根据订阅关系，将每路流**原封不动地转发**给其他需要的参会者。
- **优点**: 服务器成本较低（只消耗带宽），延迟低，灵活性高（客户端可自由控制布局）。
- **缺点**: 客户端下行带宽和解码压力较大（需要接收 `N-1` 路流）。

### 总结对比

| 特性               | P2P (Mesh)  | MCU          | SFU          |
| :----------------- | :---------- | :----------- | :----------- |
| **网络拓扑**       | 网状        | 星形         | 星形         |
| **服务器角色**     | 仅信令/穿透 | 媒体处理中心 | 媒体转发中心 |
| **服务器 CPU**     | 无          | 极高         | 低           |
| **客户端上行带宽** | `N-1` 路    | 1 路         | 1 路         |
| **客户端下行带宽** | `N-1` 路    | 1 路         | `N-1` 路     |
| **延迟**           | 最低        | 高           | 低           |
| **灵活性**         | 高          | 低           | 高           |
| **适用规模**       | 2-4人       | 大规模       | 大规模       |

**结论:** 在现代 WebRTC 应用中，**SFU 已经成为构建多人通话应用的事实标准**。

---

### **学员提问与解答 (Q&A)**

#### **Q: SFU 和 P2P 看起来都要接收 N-1 路流，区别在哪？**

**A:** 关键区别在于**连接数**和**上行负载**。

- **P2P**: 客户端需要建立 **`N-1` 个 `RTCPeerConnection`**，并发送 **`N-1` 路**音视频流。这导致上行带宽和 CPU 编码压力极大。
- **SFU**: 客户端**只需建立 1 个**到 SFU 服务器的 `RTCPeerConnection`，并**只发送 1 路**音视频流。所有其他人的流都通过这一个连接接收。SFU 解决了 P2P 最致命的上行瓶颈。

#### **Q: TURN 和 MCU/SFU 的区别是什么？**

**A:** 它们解决的问题完全不同。

- **TURN**: 是 **NAT 穿透**的最后手段，一个**网络层**的“笨”中继，仅在两个 Peer 无法直连时，为它们转发网络包。它是底层连接建立的工具。
- **MCU/SFU**: 是**应用层**的媒体服务器架构，用于解决**多人通话的扩展性**问题。它是会议的中心枢纽，组织和分发媒体流。

#### **Q: SFU 模式下，如何区分收到的流是谁的？**

**A:** 通过**信令**。当一个新用户（如 C）加入并推流时，SFU 会通过 WebSocket 广播一条消息，告诉所有人：“即将到来的一条新轨道属于用户 C”。客户端收到信令后，在下一次 `ontrack` 事件触发时，就能将新收到的 `MediaStreamTrack` 与用户 C 关联起来。

#### **Q: TURN 服务器如何使用？**

**A:** 和 STUN 一样，通过在 `RTCPeerConnection` 初始化时配置 `iceServers` 数组。TURN 服务器通常需要用户名和密码认证。浏览器 ICE 代理会自动在 STUN 失败时，尝试使用 TURN 服务器进行中继。

```javascript
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:my-turn-server.com:3478',
      username: 'user',
      credential: 'password',
    },
  ],
};
```

---

## 步骤 6.3: 展望 - 如何集成开源 SFU 服务

自己从零开发 SFU 非常复杂，通常选择集成开源项目，如 **Mediasoup**, **Pion**, **Janus**, 或 **LiveKit**。

从 P2P 迁移到 SFU，客户端代码主要改变：

1.  **重构信令逻辑**: 对接 SFU 自定义的信令协议（如 `join`, `publish`, `subscribe`）。
2.  **`RTCPeerConnection` 管理**: 通常创建两个 PeerConnection，一个用于**发布 (Publish)** 自己的流，一个用于**订阅 (Subscribe)** 他人的流。
3.  **动态 UI 管理**: 根据信令通知（如 `new-participant`, `participant-left`）动态创建和销毁远程视频元素。

---

### **学员提问与解答 (高级)**

#### **Q: 10人会议，SFU 模式下的客户端带宽和 CPU 压力如何？**

**A:** 假设标清视频 `800 Kbps`，音频 `50 Kbps`。

| 负载类型       | P2P (10人)           | SFU (10人)               | 变化         |
| :------------- | :------------------- | :----------------------- | :----------- |
| **上行带宽**   | 极高 (`~7.7 Mbps`)   | 低 (`~0.85 Mbps`)        | **极大降低** |
| **下行带宽**   | 高 (`~7.7 Mbps`)     | 高 (`~7.7 Mbps`, 可优化) | 基本持平     |
| **CPU (编码)** | 极高 (为9个连接准备) | 低 (为1个连接准备)       | **极大降低** |
| **CPU (解码)** | 高 (解码9路流)       | 高 (解码9路流)           | 基本持平     |

SFU 通过将**上行**和**编码**的压力固定为 `1`，彻底解决了 P2P 的核心瓶颈。

#### **Q: 深入解析：Simulcast (同流联播) 的工作原理**

**A:** Simulcast 的魔法并不在 `addTrack` 本身，而是在 `RTCPeerConnection` 的一个更高级的配置中，通常是通过 `addTransceiver` API 来实现的。

**1. 如何发送多路分辨率？**

Simulcast 的原理是告诉 `RTCRtpSender` (媒体发送器)：“对于这同一个视频轨道，请你帮我**同时编码出三个不同质量的版本**（称之为编码层 `encodings` 或 `layers`），然后一起发出去。”

一个概念性的代码配置可能长这样：

```javascript
// 这是一个简化的概念，实际 API 可能略有不同
const transceiver = peerConnection.addTransceiver('video', {
  direction: 'sendonly',
  // 关键在这里！定义了三个编码层
  sendEncodings: [
    { rid: 'l', maxBitrate: 200 * 1024, scaleResolutionDownBy: 4.0 }, // 低分辨率
    { rid: 'm', maxBitrate: 500 * 1024, scaleResolutionDownBy: 2.0 }, // 中分辨率
    { rid: 'h', maxBitrate: 1500 * 1024 }, // 高分辨率（原始）
  ],
});
transceiver.sender.replaceTrack(localVideoStream.getVideoTracks()[0]);
```

这段配置告诉浏览器，为同一个视频源，同时编码出高、中、低三个版本的数据流，并打包在一起发送出去。

**2. 为什么 P2P 模式很难利用 Simulcast？**

在 P2P (Mesh) 模式下，发送方 A 向 B 发送了一个包含高、中、低三个版本的 Simulcast 流。B 的客户端**确实接收到了全部三个版本**。但它的 `RTCPeerConnection` 无法智能地只选择其中一个版本，网络依然**被迫接收了所有三个版本的数据**，下行带宽一点都没省。

**3. SFU 如何释放 Simulcast 的威力？**

1.  发送方 A 把包含高、中、低三个版本的流，只发送**一次**给 SFU 服务器。
2.  SFU 知道接收方 B 只是一个小窗口，于是 SFU **只把低版本的流转发给 B**。高、中版本的流在 SFU 那里就被“截胡”了。
3.  SFU 知道接收方 C 正在全屏，于是 **只把高版本的流转发给 C**。

**总结**: Simulcast 是**客户端的能力**，但它的价值需要**SFU 服务器的智能转发**才能真正释放出来，实现精细化的流量控制。

#### **Q: 如果不设置 Simulcast，默认行为是什么？**

**A:** 默认发送**一路动态自适应的流**。WebRTC 的带宽估计算法会根据网络状况，实时自动调整这一路流的码率和分辨率，以保证通话流畅。

#### **Q: P2P 模式下，B 不能通过信令让 A 改变推流质量吗？**

**A:** **技术上完全可行**。B 可以发信令给 A，A 收到后调用 `RTCRtpSender.setParameters()` 方法，动态修改发送给 B 的那一路流的编码参数（如 `maxBitrate`）。

但在一个多人 (Mesh) 网络中，这种方式会导致**灾难性的复杂度和性能问题**：

1.  **管理复杂度爆炸**: 发送方 A 必须同时管理和追踪 `N-1` 份完全不同的发送策略。
2.  **致命的性能开销**: 为了满足每个接收者的不同需求，发送方 A 的设备可能需要**启动 `N-1` 个独立的视频编码进程**，这又回到了 CPU 消耗是 `N-1` 倍的噩梦里。

SFU 架构通过“客户端负责高效生产，服务器负责智能分发”，完美地解决了这个问题。

**`setParameters()` 伪代码示例:**

```javascript
// B 客户端的 UI 逻辑
const qualitySelector = document.getElementById('qualitySelector');

qualitySelector.addEventListener('change', event => {
  const selectedQuality = event.target.value; // "high" or "low"

  // 通过信令向 A 发送质量变更请求
  console.log(`向 A 发送请求，要求质量变为: ${selectedQuality}`);
  signaling.send('user_A', {
    type: 'quality-change-request',
    quality: selectedQuality,
  });
});

// A 客户端的逻辑
// 假设 videoSenderForB 是 A 上负责向 B 发送视频的 RTCRtpSender 实例
signaling.on('message', (from, message) => {
  if (from === 'user_B' && message.type === 'quality-change-request') {
    console.log(`收到来自 B 的质量变更请求: ${message.quality}`);

    const parameters = videoSenderForB.getParameters();
    if (!parameters.encodings) {
      parameters.encodings = [{}];
    }

    if (message.quality === 'high') {
      parameters.encodings[0].maxBitrate = 1500000; // 1.5 Mbps
    } else if (message.quality === 'low') {
      parameters.encodings[0].maxBitrate = 300000; // 300 Kbps
    } else {
      delete parameters.encodings[0].maxBitrate; // 恢复自动
    }

    videoSenderForB
      .setParameters(parameters)
      .then(() => console.log('成功应用新的码率参数！'))
      .catch(e => console.error('应用新的码率参数失败:', e));
  }
});
```

#### **Q: WebRTC 核心名词扫盲 (码率、编解码器等)**

**A:**

**1. 码率 (Bitrate)**

- **是什么**: 单位时间内传输的数据量，单位 `bps` (bits per second)。`Kbps` (千比特每秒), `Mbps` (兆比特每秒)。
- **作用**: 衡量数据传输的速率，可以想象成水管的直径。
- **和质量的关系**: 码率直接决定了音视频质量。高码率带来更清晰的画质和更丰富的细节，但更占带宽。

**2. 其他核心名词**

- **编解码器 (Codec)**
  - **是什么**: `Coder-Decoder` 的缩写。负责**压缩**和**解压**音视频数据的算法。
  - **为什么需要**: 原始音视频数据巨大，必须压缩才能在互联网传输。
  - **常见的**: 视频 `H.264`, `VP9`, `AV1`；音频 `Opus`。
- **分辨率 (Resolution)**
  - **是什么**: 画面的尺寸，即像素点的数量 (如 `1280x720`)。分辨率越高，就需要越高的码率来维持清晰度。
- **帧率 (Framerate, FPS)**
  - **是什么**: `Frames Per Second`，每秒显示的画面帧数。决定了视频的流畅度，通话一般需要 `30 FPS`。
- **抖动 (Jitter)**
  - **是什么**: 网络传输中，数据包到达时间的不均匀性。会导致画面卡顿、声音断续。
- **丢包 (Packet Loss)**
  - **是什么**: 网络传输中，部分数据包丢失了。会导致视频花屏、音频中断。

**实时通话码率参考指南:**
| 质量等级 | 常见分辨率 | 推荐码率范围 (Bitrate Range) |
| :--------------- | :------------ | :----------------------------- |
| **低流量 (Low)** | 240p / 360p | **200 Kbps - 800 Kbps** |
| **中流量 (Medium)**| 480p / 720p | **800 Kbps - 2.5 Mbps** |
| **高流量 (High)** | 1080p | **2.5 Mbps - 5 Mbps** |
