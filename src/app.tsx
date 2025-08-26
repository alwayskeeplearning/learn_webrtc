import  { useRef, useEffect, useState } from 'react';
import styles from './app.less';

const App = () => {
  // 创建 Refs 来安全地引用 DOM 元素
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // 创建一个 Ref 来存储本地媒体流对象
  const localStreamRef = useRef<MediaStream | null>(null);

  // 创建一个 Ref 来存储 RTCPeerConnection 实例
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  
  // 创建一个 Ref 来存储 WebSocket 实例
  const socketRef = useRef<WebSocket | null>(null);

  // --- 按钮的 Refs ---
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const callButtonRef = useRef<HTMLButtonElement>(null);
  const hangupButtonRef = useRef<HTMLButtonElement>(null);

  // --- 共享屏幕状态 ---
  const [isSharing, setIsSharing] = useState(false);

  // --- WebSocket 连接逻辑 ---
  useEffect(() => {
    // 步骤 2.3 (已更新): 连接到安全的、内网可访问的信令服务器
    const socket = new WebSocket('wss://10.10.6.13:8080');

    socket.onopen = () => {
      console.log('成功连接到信令服务器');
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log('收到信令消息:', message);

      if (message.type === 'offer') {
        // --- 被叫方逻辑 ---
        console.log('收到 Offer');
        // 确保本地流已准备好
        if (!localStreamRef.current) {
            console.error('收到 offer 时，本地媒体流尚未准备好');
            return;
        }
        // 1. 创建 PeerConnection (如果不存在)
        const pc = createPeerConnection();
        // 2. 将本地流添加到连接
        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });
        // 3. 设置远程描述
        await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
        // 4. 创建 Answer
        const answer = await pc.createAnswer();
        // 5. 设置本地描述
        await pc.setLocalDescription(answer);
        // 6. 发送 Answer
        if (socketRef.current) {
            console.log('发送 Answer');
            socketRef.current.send(JSON.stringify({ type: 'answer', answer: answer }));
        }
      } else if (message.type === 'answer') {
        // --- 呼叫方逻辑 ---
        console.log('收到 Answer');
        if (peerConnectionRef.current) {
          // 设置远程描述
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.answer));
        }
      } else if (message.type === 'candidate') {
        // --- 公共逻辑：接收并添加 ICE Candidate ---
        console.log('收到 ICE Candidate');
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
          } catch (error) {
            console.error('添加 ICE Candidate 失败:', error);
          }
        }
      }
    };

    socket.onclose = () => {
      console.log('与信令服务器的连接已关闭');
    };

    socket.onerror = (error) => {
      console.error('WebSocket 发生错误:', error);
    };

    // 将 socket 实例存入 ref
    socketRef.current = socket;

    // 在组件卸载时，清理 WebSocket 连接
    return () => {
      socket.close();
    };
  }, []); // 空依赖数组意味着这个 effect 只会在组件挂载时运行一次

  const createPeerConnection = () => {
    console.log('创建 RTCPeerConnection');
    // 步骤 3.3: 创建 RTCPeerConnection 并配置 STUN 服务器
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // 增加国内常用的 STUN 服务器作为备用，提高成功率
        { urls: 'stun:stun.qq.com:3478' },
        { urls: 'stun:stun.miwifi.com:3478' },
      ],
    };
    const pc = new RTCPeerConnection(configuration);

    // 步骤 3.3: 设置 onicecandidate 事件处理器
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // event.candidate.candidate 是一个包含详细信息的字符串
        const candidateString = event.candidate.candidate;
        console.log('发现新的 ICE Candidate:', candidateString);
        
        // 判断并打印 Candidate 类型
        if (candidateString.includes("typ host")) {
          console.log("类型: Host Candidate (本地地址)");
        } else if (candidateString.includes("typ srflx")) {
          console.log("类型: Server Reflexive Candidate (STUN 公网地址)");
        } else if (candidateString.includes("typ relay")) {
          console.log("类型: Relayed Candidate (TURN 中继地址)");
        }

        // 步骤 3.5: 通过信令服务器将这个 candidate 发送给对方
        if (socketRef.current) {
            socketRef.current.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
      }
    };

    // 步骤 3.3 / 3.6: 设置 ontrack 事件处理器
    pc.ontrack = (event) => {
      console.log('接收到远程媒体流:', event.streams[0]);
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // 将创建的实例存入 ref
    peerConnectionRef.current = pc;
    return pc;
  }

  const handleCallClick = async () => {
    console.log('呼叫按钮被点击');
    
    // 确保本地流存在
    if (!localStreamRef.current) {
        console.error('错误：本地媒体流不存在。');
        return;
    }
    
    // 创建 RTCPeerConnection
    const pc = createPeerConnection();

    // 步骤 3.3: 将本地媒体流的轨道添加到 RTCPeerConnection
    localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
    });

    // 步骤 3.4 (部分): 创建 Offer 以启动 ICE 协商
    // 只有在 setLocalDescription 调用后，ICE 代理才会开始收集候选地址
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('创建 Offer 成功，并设置为本地描述。ICE Agent 开始收集 Candidates...');
      // 步骤 3.4: 通过信令服务器发送 Offer
      if (socketRef.current) {
        console.log('发送 Offer');
        socketRef.current.send(JSON.stringify({ type: 'offer', offer: offer }));
      }
    } catch (error) {
      console.error('创建 Offer 失败:', error);
    }
  }

  const handleStartClick = async () => {
      if (!startButtonRef.current || !localVideoRef.current || !callButtonRef.current || !hangupButtonRef.current) return;
      
      startButtonRef.current.disabled = true;
      try {
        // 步骤 1.4: 调用 getDisplayMedia API 获取媒体流
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        console.log('成功获取到本地屏幕流:', stream);

        // 步骤 1.5: 将媒体流在 <video> 元素中播放
        const localVideo = localVideoRef.current;
        localVideo.srcObject = stream;

        // 将流存起来，以便后续步骤（比如呼叫）可以使用
        localStreamRef.current = stream;

        // 更新UI状态
        setIsSharing(true);

      } catch (error) {
        console.error('获取屏幕流失败:', error);
        // 如果用户取消或者发生错误，恢复按钮状态
        setIsSharing(false);
      }
    };

  useEffect(() => {
    const startButton = startButtonRef.current!;
    const callButton = callButtonRef.current!;
    const hangupButton = hangupButtonRef.current!;
    if (isSharing) {
      startButton.disabled = true;
      callButton.disabled = false;
      hangupButton.disabled = false;
    } else {
      startButton.disabled = false;
      callButton.disabled = true;
      hangupButton.disabled = true;
    }
  }, [isSharing]);

  const handleMouseEnter = () => {
    console.log('handleMouseEnter', localVideoRef.current?.readyState, isSharing);
    if (localVideoRef.current && localVideoRef.current.readyState === 4 && isSharing) {
      // 放大2倍
      localVideoRef.current.style.transform = 'scale(2)';
      localVideoRef.current.style.transformOrigin = 'left center';
    }
  };

  const handleMouseLeave = () => {
    if (localVideoRef.current && localVideoRef.current.readyState === 4 && isSharing) {
      localVideoRef.current.style.transform = 'scale(1)';
      localVideoRef.current.style.transformOrigin = 'left center';
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>WebRTC 屏幕共享</h1>
      <div className={styles.videoContainer}>
        <div className={styles.videoBox}>
          <h2>本地屏幕</h2>
          <video
            ref={localVideoRef} // 将 video 元素与 ref 关联
            className={styles.videoPlayer}
            autoPlay
            playsInline
            muted
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          ></video>
        </div>
        <div className={styles.videoBox}>
          <h2>远程屏幕</h2>
          <video
            ref={remoteVideoRef} // 将 video 元素与 ref 关联
            className={styles.videoPlayer}
            autoPlay
            playsInline
          ></video>
        </div>
      </div>
      <div className={styles.buttonContainer}>
        <button ref={startButtonRef} className={styles.button} onClick={handleStartClick}>
          开始分享
        </button>
        <button ref={callButtonRef} className={styles.button} onClick={handleCallClick}>
          呼叫
        </button>
        <button ref={hangupButtonRef} className={styles.button}>
          挂断
        </button>
      </div>
    </div>
  );
};

export default App;
