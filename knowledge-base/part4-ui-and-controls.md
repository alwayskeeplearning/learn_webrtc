# 部分4: 构建基础的用户界面 (UI) 与通话控制

在实现了核心的点对点视频流传输后，本部分专注于构建一个用户友好的界面，并实现完整的通话生命周期管理，特别是优雅地挂断通话。

---

### 步骤 4.1: 创建必要的 HTML 元素 (理论与实现)

一个基础的 WebRTC 应用需要以下核心 UI 元素，以便用户可以与之交互：

- **本地视频窗口 (`<video>`)**: 用于在通话前预览、在通话中确认自己的视频画面。
- **远程视频窗口 (`<video>`)**: 用于显示对方的视频流。
- **呼叫/发起按钮 (`<button>`)**: 触发创建 `Offer` 并通过信令服务器发送给对方的逻辑。
- **挂断按钮 (`<button>`)**: 触发关闭连接、释放资源、重置UI的逻辑。

在我们的 React 项目 (`src/app.tsx`) 中，这些元素已经通过 `useRef` Hooks 和 JSX 进行了实现，例如 `localVideoRef`、`remoteVideoRef` 以及对应的按钮。

---

### 步骤 4.3: 实现挂断通话、关闭连接

这是确保应用健壮性的关键一步。一个“干净”的挂断操作能避免资源泄漏和糟糕的用户体验。

#### 理论知识

一个完整的挂断流程包含三个核心环节：

1.  **关闭 `RTCPeerConnection`**: 调用 `peerConnection.close()` 方法。这是挂断的核心，它会终止 ICE Agent 的工作，停止所有媒体流传输，并释放网络端口。
2.  **停止本地媒体流**: 调用 `localStream.getTracks().forEach(track => track.stop())`。这会释放对物理设备（如摄像头、屏幕）的控制，使用户隐私得到保护。
3.  **重置UI和应用状态**: 将 `<video>` 元素的 `srcObject` 设为 `null`，并更新 React state 以重置按钮的可用状态，为下一次通话做准备。

#### Q&A 精选

**问题1: ICE Agent 是什么？**

**回答**: ICE Agent (交互式连接建立代理) 可以理解为 WebRTC 内部的一个**智能网络探路器**或**首席网络协商官**。

它的全称是 **Interactive Connectivity Establishment**。在 `RTCPeerConnection` 创建时，它就随之诞生，并且默默地在后台为你完成最复杂的“网络穿透”工作。

它的主要职责有以下四项：

1.  **搜集“候选地址” (Gathering Candidates)**:
    它的首要任务是搜集所有能联系到你电脑的网络地址。这些地址主要有三种类型：

    - **Host Candidate (本地地址)**: 你电脑在局域网内的地址（例如 `192.168.1.10`）。
    - **Server Reflexive Candidate (srflx - 公网地址)**: 你家路由器在互联网上的公开地址，通过 STUN 服务器发现。
    - **Relay Candidate (中继地址)**: 在网络严格受限时，通过 TURN 中继服务器获取的地址。

2.  **交换“候选地址” (Exchanging Candidates)**:
    ICE Agent 把搜集到的地址列表，通过信令服务器发送给对方。这就是我们代码中 `onicecandidate` 事件触发后，发送 `'candidate'` 消息的过程。

3.  **进行“连通性检查” (Connectivity Checks)**:
    这是最关键的一步。收到对方的地址列表后，双方的 ICE Agent 会开始两两配对，互相发送轻量级的探测包（STUN Pings）来测试哪条路是通的。

4.  **选择最佳路径 (Selecting the Best Path)**:
    一旦找到一条可用的、最高效的路径（优先级通常是：局域网直连 > 公网直连 > TURN中继），ICE Agent 就会选定这条路来传输真正的音视频数据。

调用 `peerConnection.close()` 时，实际上就是命令 ICE Agent 停止所有工作并释放资源。

**问题2: 我点击挂断后，对方的界面为什么没有反应？**

**回答**: 因为最初的挂断逻辑是**纯本地**的。A 端挂断只关闭了 A 端的连接，B 端对此毫不知情。正确的做法是**通过信令进行同步**：

1.  **发送信令**: A 端点击挂断时，先通过 WebSocket 发送一个 `{ type: 'hangup' }` 消息给 B 端。
2.  **接收处理**: B 端收到 `hangup` 消息后，触发其本地的挂断清理函数。
    这样，双方就能同步结束通话，重置UI。

**问题3: 呼叫按钮在点击后为什么没有被禁用？**

**回答**: 因为 UI 的状态没有完全反映通话的生命周期。仅有一个 `isSharing` 状态是不够的。
**解决方案**: 引入一个新的 `callInProgress` 状态：

- 在发起呼叫时，设置 `setCallInProgress(true)`。
- 在通话结束时（无论哪方挂断），设置 `setCallInProgress(false)`。
- 按钮的禁用逻辑需要同时依赖 `isSharing` 和 `callInProgress` 两个状态，从而实现更精确的交互控制。例如，“呼叫”按钮仅在 `isSharing && !callInProgress` 时可用。
