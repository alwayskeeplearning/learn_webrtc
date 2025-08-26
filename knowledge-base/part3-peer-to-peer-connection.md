# Part 3: 建立对等连接 (Peer-to-Peer)

## 步骤 3.1: 理论 - RTCPeerConnection, NAT 穿透, ICE, STUN/TURN

### `RTCPeerConnection` 核心对象

`RTCPeerConnection` 是 WebRTC API 的核心，它负责建立和管理两个对等点之间的连接。一旦连接建立，音视频数据就可以通过它直接传输。

#### 核心工作流程

1.  **创建实例**: `const peerConnection = new RTCPeerConnection(configuration);`
2.  **添加本地媒体流**: 将通过 `getDisplayMedia` 获取的本地 `MediaStream` 添加到连接中。
3.  **创建 Offer (提议)**: 作为通话发起方，创建包含自身媒体能力描述 (SDP) 的 "Offer"。
4.  **设置本地描述**: 调用 `setLocalDescription` 将 Offer 设置为自己的状态。
5.  **发送 Offer**: 通过信令服务器将 Offer 发送给对方。
6.  **接收 Answer (应答)**: 等待对方通过信令服务器发回一个 "Answer"。
7.  **设置远程描述**: 收到 Answer 后，调用 `setRemoteDescription` 将其设置为对方的状态。

完成 SDP 交换后，双方就媒体参数达成一致。但真正的网络连接尚未建立。

---

### NAT 穿透：最大的挑战

**NAT (网络地址转换 / Network Address Translation)** 是一种网络机制，它允许多个设备（使用私有IP地址，如 `192.168.1.x`）共享同一个公共IP地址来访问互联网。这带来了 WebRTC 的核心挑战：位于不同 NAT 后面的两个设备无法直接通过对方的私有IP地址进行通信。

**NAT 穿透 (NAT Traversal)** 的目标就是找到一种方法，让这两个设备能够“穿透”各自的 NAT 防火墙，建立直接的 P2P 连接。

### ICE: 寻找最佳连接路径

WebRTC 使用 **ICE (Interactive Connectivity Establishment)** 协议框架来解决 NAT 穿透问题。ICE 的任务是全面地收集所有可能的连接候选地址 (ICE Candidates)，然后尝试所有可能性，最终选择一条最佳路径来建立连接。

#### ICE 候选地址 (ICE Candidates) 的三种类型：

1.  **主机候选地址 (Host Candidate)**: 设备的本地局域网 IP 地址。如果双方在同一网络下，这是最快的连接方式。
2.  **服务器反射地址 (Server Reflexive Candidate)**: 设备在公网上的 IP 地址和端口。这个地址需要通过 **STUN** 服务器来发现。
3.  **中继候选地址 (Relayed Candidate)**: 一个 **TURN** 服务器的地址。当直接连接失败时，所有数据将通过这个服务器进行中继转发。

### STUN 和 TURN 服务器：ICE 的关键助手

- **STUN (Session Traversal Utilities for NAT)**:

  - **作用**: 一个轻量级服务器，其唯一功能是告诉客户端它在公网上的 IP 地址和端口是什么。
  - **原理**: 客户端向 STUN 服务器发送请求，STUN 服务器从收到的数据包的网络头中看到客户端的公网地址和端口，然后将这个信息返回给客户端。
  - **限制**: STUN 服务器不参与媒体数据传输，开销极小。但它无法处理某些严格的 NAT 类型（如对称 NAT）。

- **TURN (Traversal Using Relays around NAT)**:
  - **作用**: 作为最后的“兜底”方案。当 P2P 连接（即使有 STUN 帮助）彻底失败时，TURN 服务器会充当所有音视频数据的中继站。
  - **原理**: 通信双方都将数据发送到 TURN 服务器，再由服务器转发给对方。
  - **缺点**: 因为所有媒体数据都流经服务器，所以对服务器的带宽和 CPU 资源消耗巨大，运营成本高昂。

### 最终流程总结

1.  双方创建 `RTCPeerConnection` 实例，并配置 STUN/TURN 服务器地址。
2.  ICE 框架在后台开始工作，收集各种类型的候选地址。
3.  双方通过**信令服务器**不断交换各自发现的 ICE Candidates。
4.  双方收到对方的 Candidate 后，会尝试进行连通性检查（Connectivity Checks）。
5.  ICE 协议会自动选择一条检查通过的最佳路径（优先级通常是 Host > STUN > TURN）。
6.  一旦连接建立，`RTCPeerConnection` 状态变为 `connected`，音视频数据开始直接传输。

---

## 常见问题与深入解答

### Q1: 什么是NAT？什么是NAT穿透？

**A1**:

- **NAT (网络地址转换)** 就像一个公寓楼的前台。它让公寓楼内的多个房间（设备，私有IP）可以共享同一个公共地址（公网IP）与外界通信，同时隐藏了内部的房间号。
- **NAT穿透** 的目标就是想办法绕过这个“前台”的常规流程，让两个不同公寓楼里的人能找到对方窗户的精确位置（公网IP+端口），从而可以直接“隔空喊话”（建立P2P连接），而不需要前台来回传话。

### Q2: STUN 服务器如何帮助发现公网IP和端口？这个端口具体指什么？路由器如何根据这个信息找到内网电脑？

**A2**:

- **公网IP**：是你的路由器在互联网上的唯一地址。
- **端口**：最关键的一点是，这个端口是**路由器为了本次对外通信，在自己身上临时开的一个公共端口**。
- **工作流程**:
  1.  你的电脑 (`192.168.1.10:54321`) 向 STUN 服务器发包。
  2.  路由器收到包，将源地址改为自己的**公网IP** (`203.0.113.10`)，并为这个连接在自己身上新开一个**公网端口** (例如 `45678`)。
  3.  路由器在内部的 **NAT映射表** 中记录下规则：`"任何发往公网端口 45678 的数据，都转给内网的 192.168.1.10:54321"`。
  4.  STUN 服务器看到包来自 `203.0.113.10:45678`，并将此地址作为信息返回给你。
  5.  你的浏览器就拿到了这个可以被公网访问的地址，这就是一个 "服务器反射候选地址"。路由器能精确地把 STUN 的返回包和之后 Peer B 的连接包转发给你，正是因为它有第3步创建的那张**映射表**。

### Q3: 为什么 STUN 会失败？TURN 又是如何成功的？

**A3**:

- **STUN 失败的原因 (对称NAT)**: 某些严格的路由器（对称NAT）创建的映射规则是：`"只有从 STUN 服务器地址发来的、到公网端口 45678 的数据，才转给内网电脑"`。当你的朋友 Peer B (一个不同的地址) 尝试连接这个端口时，路由器会因为来源地址不匹配而**拒绝**并丢弃数据包，导致连接失败。
- **TURN 成功的原因**: TURN 巧妙地利用了所有 NAT 都允许的“由内而外”的连接。
  1.  你和 Peer B **都主动地**与 TURN 服务器建立连接。各自的路由器都会为这个连接创建映射表，并允许 TURN 服务器返回数据。
  2.  你把数据发给 TURN 服务器（这是允许的），TURN 服务器再把数据通过它与 Peer B 建立好的通道转发给 Peer B（ Peer B 的路由器认为这是合法连接的返回数据，因此也允许）。
  3.  通过这种“中转”方式，数据成功送达。代价是所有数据都经过服务器，成本较高。

### Q4: "NAT穿透后不再需要前台"的比喻是否准确？数据不是还要经过路由器吗？

**A4**: 这个问题非常精准。这里的“前台”有双重含义：

- **慢速的“人工总机” (对应 TURN 服务器)**: 需要在应用层处理数据，速度慢，开销大。
- **高速的“自动分拣机” (对应路由器的NAT功能)**: 只在网络层根据映射表快速转发数据包，由硬件加速，速度极快。

P2P 连接的“直接”，指的是**摆脱了慢速的“人工总机”**，数据不再需要经过任何应用服务器中转。但数据流**仍然需要经过高速的“自动分拣机”**，即你的路由器，由其 NAT 功能进行地址转换。这个过程快到可以被认为是“直接”的。

### Q5: 路由器为NAT映射临时开启的公网端口，其生命周期是怎样的？

**A5**: 这个端口的生命周期由 **NAT 映射超时 (NAT Mapping Timeout)** 机制决定。

- **创建**: 当你的电脑第一次对外通信时，路由器创建映射规则并开启一个公网端口，同时启动一个倒计时（如 30-120秒）。
- **维持 (Keep-alive)**: 只要有任何数据包（无论流入还是流出）通过这个映射，倒计时就会被重置。WebRTC 连接建立后会周期性地发送微小的数据包来维持这个映射的活性。
- **释放**: 如果在倒计时结束前没有任何数据活动，路由器会认为连接已失效，便会删除该映射规则，回收这个公网端口。当通话结束（`peerConnection.close()`），keep-alive 停止，映射会自然超时释放。

---

## 步骤 3.2: 理论 - SDP (会话描述协议)

### SDP 是什么？

**SDP (Session Description Protocol)** 是一种纯文本格式标准，可以被看作一份**媒体简历**。它用来详细描述音视频会话的能力，以便双方就如何通信达成一致。

- **Offer (提议)**: 呼叫方生成的 SDP，描述自己能支持的媒体类型、编码格式、加密算法等。
- **Answer (应答)**: 被叫方收到 Offer 后，生成一个 Answer SDP 作为回应，其中包含了双方共同支持的配置。

通过这个 **Offer/Answer 模型** 的交换，双方就媒体细节“签署了合同”，为后续的媒体流传输做好了准备。

### SDP 结构示例

SDP 由多行 `类型=值` 组成，浏览器会自动生成，我们只需了解其基本构成：

```
v=0
...
m=audio 9 UDP/TLS/RTP/SAVPF 111 ...  // 声明音频流和支持的编码代号
a=rtpmap:111 opus/48000/2             // 解释代号111是Opus编码
...
m=video 9 UDP/TLS/RTP/SAVPF 96 ...   // 声明视频流和支持的编码代号
a=rtpmap:96 VP8/90000                  // 解释代号96是VP8编码
...
```

---

## 步骤 3.3: 实现 - 创建 RTCPeerConnection

### 核心 API

- **`new RTCPeerConnection(configuration)`**: 构造函数，`configuration` 对象用于指定 ICE 服务器，例如公共 STUN 服务器。
  ```javascript
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // 增加更多备用服务器以提高连接成功率
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.qq.com:3478' },
    ],
  };
  ```
- **`peerConnection.onicecandidate`**: 事件处理器。每当 ICE 代理发现一个新的候选地址时触发。我们需要在此事件中将 `event.candidate` 通过信令服务器发送给对方。
- **`peerConnection.ontrack`**: 事件处理器。当 P2P 连接成功，远程媒体流到达时触发。我们需要在此事件中获取 `event.streams[0]` 并显示在 video 元素中。
- **`peerConnection.addTrack(track, stream)`**: 将本地媒体流的轨道添加到连接中，告知 PeerConnection 要发送哪些数据。

### Q&A: STUN 服务器成本、必要性及 Candidate 类型判断

- **Q: STUN 服务器成本高吗？可以自己实现吗？**

  - **A**: 成本极低，完全可以自己实现（例如使用开源的 `coturn` 项目）。STUN 服务器只做地址发现，不处理媒体流，因此对带宽和CPU消耗极小。对于学习和开发，使用免费的公共 STUN 服务器是最高效的选择。

- **Q: 如果只做内网通信，可以省略 STUN 吗？**

  - **A**: 理论上在绝对理想的内网中可以。但实践中，由于企业网络VLAN隔离、公共Wi-Fi客户端隔离等复杂情况的存在，**强烈建议始终配置 STUN 服务器**。ICE 协议会自动优先选择最快的内网路径（Host Candidate），STUN 只是提供了一个必要的“备用选项”，能极大提升连接的成功率和鲁棒性。

- **Q: 如何判断发现的 ICE Candidate 是哪种类型？**

  - **A**: 观察 `event.candidate.candidate` 这个字符串属性。其中包含 `typ <candidate-type>` 字段，明确标识了候选者类型：
    - **`typ host`**: 主机候选地址 (内网IP)。
    - **`typ srflx`**: 服务器反射候选地址 (通过STUN发现的公网IP)。
    - **`typ relay`**: 中继候选地址 (通过TURN提供的服务器地址)。

- **Q: 为什么有时只发现 Host Candidate，没有 srflx Candidate？**
  - **A**: 通常是由于当前**网络环境的防火墙**阻止了浏览器与 STUN 服务器（特别是其使用的非标准端口）的通信。解决方案是配置多个备用 STUN 服务器，特别是那些使用标准端口（3478）的服务器，以增加连接成功的概率。

---

## 步骤 3.4 & 3.5 & 3.6: 实现完整的信令交换与连接

### 流程概述

1.  **定义信令消息格式**: 使用带 `type` 字段的 JSON 对象来区分不同类型的信令，如 `offer`, `answer`, `candidate`。

2.  **实现呼叫方 (Caller) 逻辑**:

    1.  创建 `RTCPeerConnection` 实例。
    2.  调用 `createOffer()`。
    3.  调用 `setLocalDescription(offer)`。**此步骤会触发 ICE 开始收集 Candidate**。
    4.  通过 WebSocket 发送 `{ "type": "offer", "offer": offer }`。
    5.  在 `onicecandidate` 事件中，通过 WebSocket 持续发送 `{ "type": "candidate", "candidate": event.candidate }`。
    6.  监听 WebSocket 消息，收到 `answer` 后，调用 `setRemoteDescription(answer)`。
    7.  监听 WebSocket 消息，收到 `candidate` 后，调用 `addIceCandidate(candidate)`。

3.  **实现被叫方 (Callee) 逻辑**:
    1.  监听 WebSocket 消息，收到 `offer` 后，创建 `RTCPeerConnection` 实例。
    2.  调用 `setRemoteDescription(offer)`。
    3.  调用 `createAnswer()`。
    4.  调用 `setLocalDescription(answer)`。**此步骤会触发 ICE 开始收集 Candidate**。
    5.  通过 WebSocket 发送 `{ "type": "answer", "answer": answer }`。
    6.  在 `onicecandidate` 事件中，通过 WebSocket 持续发送 `{ "type": "candidate", "candidate": event.candidate }`。
    7.  监听 WebSocket 消息，收到 `candidate` 后，调用 `addIceCandidate(candidate)`。

### 连接成功

当双方交换了足够的 ICE Candidate 并且 ICE 代理成功找到一条可用路径后，P2P 连接便会建立。此时，`ontrack` 事件会在接收方触发，我们从中获取远程媒体流并将其设置到 `<video>` 元素的 `srcObject` 属性上，最终成功显示远程画面。
