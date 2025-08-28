import { useReducer, useRef, useEffect, useState } from 'react';
import styles from './app.less';

// 步骤 5.1: 将硬编码的常量提取出来
const SIGNALING_SERVER_URL = 'wss://10.10.6.13:8080';
const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.qq.com:3478' },
    { urls: 'stun:stun.miwifi.com:3478' },
  ],
};

// 步骤 5.1: 使用枚举（或常量对象）来定义清晰的通话状态
const CallStatus = {
  IDLE: 'idle', // 空闲，未开始共享
  SHARING: 'sharing', // 已共享屏幕，但未通话
  CALLING: 'calling', // 正在呼叫（对于主叫方）
  IN_CALL: 'in_call', // 通话中
};

// 步骤 5.1: 定义 state 的类型 (增加 dataChannel 和 messages)
interface IState {
  callStatus: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  socket: WebSocket | null;
  dataChannel: RTCDataChannel | null; // 新增: 数据通道实例
}

// 步骤 5.1: 定义 Action 的类型 (增加 dataChannel action)
type Action =
  | { type: 'SET_CALL_STATUS'; payload: string }
  | { type: 'SET_LOCAL_STREAM'; payload: MediaStream | null }
  | { type: 'SET_REMOTE_STREAM'; payload: MediaStream | null }
  | { type: 'SET_PEER_CONNECTION'; payload: RTCPeerConnection | null }
  | { type: 'SET_SOCKET'; payload: WebSocket | null }
  | { type: 'SET_DATA_CHANNEL'; payload: RTCDataChannel | null } // 新增
  | { type: 'RESET_STATE' };

// 步骤 5.1: 初始状态 (增加 dataChannel 和 messages)
const initialState: IState = {
  callStatus: CallStatus.IDLE,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  socket: null,
  dataChannel: null, // 新增
};

// 步骤 5.1: 创建 Reducer 函数 (处理 dataChannel action)
function reducer(state: IState, action: Action): IState {
  switch (action.type) {
    case 'SET_CALL_STATUS':
      return { ...state, callStatus: action.payload };
    case 'SET_LOCAL_STREAM':
      return { ...state, localStream: action.payload };
    case 'SET_REMOTE_STREAM':
      return { ...state, remoteStream: action.payload };
    case 'SET_PEER_CONNECTION':
      return { ...state, peerConnection: action.payload };
    case 'SET_SOCKET':
      return { ...state, socket: action.payload };
    case 'SET_DATA_CHANNEL':
      return { ...state, dataChannel: action.payload };
    case 'RESET_STATE':
      // 在挂断时重置状态，但不重置 socket 连接
      return {
        ...initialState,
        socket: state.socket, // 保留 socket 实例
      };
    default:
      return state;
  }
}

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<string[]>([]); // 新增: 存储聊天消息
  const [chatInput, setChatInput] = useState(''); // 新增: 聊天输入框内容

  // 步骤 5.1 修复: 创建一个 ref 来持有最新的 state，解决陈旧闭包问题
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 将 state 中的流同步到 video 元素
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = state.localStream;
    }
  }, [state.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = state.remoteStream;
    }
  }, [state.remoteStream]);

  // --- WebSocket 连接逻辑 ---
  useEffect(() => {
    const socket = new WebSocket(SIGNALING_SERVER_URL);
    dispatch({ type: 'SET_SOCKET', payload: socket });

    socket.onopen = () => console.log('成功连接到信令服务器');
    socket.onclose = () => console.log('与信令服务器的连接已关闭');
    socket.onerror = (error) => console.error('WebSocket 发生错误:', error);

    socket.onmessage = async (event) => {
      // 步骤 5.1 修复: 从 ref 中读取最新的 state
      const currentState = stateRef.current;
      const message = JSON.parse(event.data);
      console.log('收到信令消息:', message);

      switch (message.type) {
        case 'offer':
          await handleOffer(message.offer, currentState);
          break;
        case 'answer':
          await handleAnswer(message.answer, currentState);
          break;
        case 'candidate':
          await handleCandidate(message.candidate, currentState);
          break;
        case 'hangup':
          handleHangup(false); // 收到对方挂断信令，被动挂断
          break;
        default:
          break;
      }
    };

    return () => {
      socket.close();
    };
  }, []); // 空依赖数组，仅在组件挂载时运行一次

  const setupDataChannelEvents = (dataChannel: RTCDataChannel) => {
    dataChannel.onopen = () => {
      console.log('数据通道已打开');
      setMessages(prev => [...prev, '系统：聊天通道已连接！']);
    };

    dataChannel.onmessage = (event) => {
      console.log('收到数据通道消息:',dataChannel, event.data);
      setMessages(prev => [...prev, `对方: ${event.data}`]);
    };

    dataChannel.onclose = () => {
      console.log('数据通道已关闭');
      setMessages(prev => [...prev, '系统：聊天通道已断开。']);
    };

    dispatch({ type: 'SET_DATA_CHANNEL', payload: dataChannel });
  }

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(STUN_SERVERS);

    pc.onicecandidate = (event) => {
      // 步骤 5.1 修复: 从 ref 读取最新的 socket state
      const currentSocket = stateRef.current.socket;
      if (event.candidate && currentSocket) {
        console.log('发送 ICE Candidate');
        currentSocket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
      }
    };

    pc.ontrack = (event) => {
      console.log('接收到远程媒体流');
      dispatch({ type: 'SET_REMOTE_STREAM', payload: event.streams[0] });
    };

    // 新增: 为被叫方设置 ondatachannel 回调
    pc.ondatachannel = (event) => {
      console.log('接收到数据通道',event.channel);
      const dataChannel = event.channel;
      setupDataChannelEvents(dataChannel);
    };

    // 将本地流的轨道添加到连接
    // 步骤 5.1 修复: 从 ref 读取最新的 localStream state
    const currentLocalStream = stateRef.current.localStream;
    if (currentLocalStream) {
        currentLocalStream.getTracks().forEach(track => {
            pc.addTrack(track, currentLocalStream);
        });
    }

    dispatch({ type: 'SET_PEER_CONNECTION', payload: pc });
    return pc;
  };

  // --- 信令消息处理函数 ---
  // 步骤 5.1 修复: 明确地将当前 state 传入处理函数
  const handleOffer = async (offer: RTCSessionDescriptionInit, currentState: IState) => {
    if (!currentState.localStream) {
      console.error('收到 offer 时，本地媒体流尚未准备好');
      return;
    }
    const pc = createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const dataChannel = pc.createDataChannel('chat1');
    setupDataChannelEvents(dataChannel);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (currentState.socket) {
      console.log('发送 Answer');
      currentState.socket.send(JSON.stringify({ type: 'answer', answer: answer }));
    }
    dispatch({ type: 'SET_CALL_STATUS', payload: CallStatus.IN_CALL });
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, currentState: IState) => {
    if (currentState.peerConnection) {
      await currentState.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('收到 Answer，连接已建立');
      dispatch({ type: 'SET_CALL_STATUS', payload: CallStatus.IN_CALL });
    }
  };

  const handleCandidate = async (candidate: RTCIceCandidateInit, currentState: IState) => {
    if (currentState.peerConnection) {
      try {
        await currentState.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('添加 ICE Candidate 失败:', error);
      }
    }
  };

  // --- UI 事件处理函数 ---
  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      console.log('成功获取到本地屏幕流');
      dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });
      dispatch({ type: 'SET_CALL_STATUS', payload: CallStatus.SHARING });
    } catch (error) {
      console.error('获取屏幕流失败:', error);
    }
  };

  const handleCall = async () => {
    dispatch({ type: 'SET_CALL_STATUS', payload: CallStatus.CALLING });
    const pc = createPeerConnection();

    // 新增: 主叫方创建数据通道
    console.log('创建数据通道');
    const dataChannel = pc.createDataChannel('chat');
    setupDataChannelEvents(dataChannel);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('发送 Offer');
      // 步骤 5.1 修复: 从 ref 读取最新的 socket state
      const currentSocket = stateRef.current.socket;
      if (currentSocket) {
        currentSocket.send(JSON.stringify({ type: 'offer', offer: offer }));
      }
    } catch (error) {
      console.error('创建 Offer 失败:', error);
    }
  };

  const handleHangup = (shouldNotifyPeer = true) => {
    console.log('处理挂断逻辑');

    // 步骤 5.1 修复: 从 ref 读取最新的 socket state
    const currentSocket = stateRef.current.socket;
    if (shouldNotifyPeer && currentSocket) {
      console.log('发送挂断信令');
      currentSocket.send(JSON.stringify({ type: 'hangup' }));
    }

    // 关闭和清理资源
    stateRef.current.dataChannel?.close(); // 新增: 关闭数据通道
    stateRef.current.peerConnection?.close();
    stateRef.current.localStream?.getTracks().forEach(track => track.stop());

    // 重置所有相关状态
    dispatch({ type: 'RESET_STATE' });
    setMessages([]); // 新增: 清空聊天记录
  };
  
  const handleSendMessage = () => {
    const currentDataChannel = stateRef.current.dataChannel;
    if (chatInput && currentDataChannel?.readyState === 'open') {
      currentDataChannel.send(chatInput);
      setMessages(prev => [...prev, `我: ${chatInput}`]);
      setChatInput('');
    }
  };

  const handleMouseEnter = () => {
    if (remoteVideoRef.current && remoteVideoRef.current.readyState === 4) {
      // 放大2倍
      remoteVideoRef.current.style.transform = 'scale(2)';
      remoteVideoRef.current.style.transformOrigin = 'left center';
    }
  };

  const handleMouseLeave = () => {
    if (remoteVideoRef.current && remoteVideoRef.current.readyState === 4) {
      remoteVideoRef.current.style.transform = 'scale(1)';
      remoteVideoRef.current.style.transformOrigin = 'left center';
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>WebRTC 屏幕共享 (已优化)</h1>
      <div className={styles.videoContainer}>
        <div className={styles.videoBox}>
          <h2>本地屏幕</h2>
          <video
            ref={localVideoRef}
            className={styles.videoPlayer}
            autoPlay
            playsInline
            muted
            
          ></video>
        </div>
        <div className={styles.videoBox}>
          <h2>远程屏幕</h2>
          <video
            ref={remoteVideoRef}
            className={styles.videoPlayer}
            autoPlay
            playsInline
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          ></video>
        </div>
      </div>
      <div className={styles.buttonContainer}>
        <button
          className={styles.button}
          onClick={handleStart}
          disabled={state.callStatus !== CallStatus.IDLE}
        >
          开始分享
        </button>
        <button
          className={styles.button}
          onClick={handleCall}
          disabled={state.callStatus !== CallStatus.SHARING}
        >
          呼叫
        </button>
        <button
          className={styles.button}
          onClick={() => handleHangup(true)}
          disabled={state.callStatus !== CallStatus.CALLING && state.callStatus !== CallStatus.IN_CALL}
        >
          挂断
        </button>
      </div>
      <div className={styles.chatContainer}>
        <h3>聊天消息</h3>
        <div className={styles.messageBox}>
          {messages.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
        <textarea
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="输入消息..."
          disabled={state.dataChannel?.readyState !== 'open'}
        />
        <button
          onClick={handleSendMessage}
          disabled={state.dataChannel?.readyState !== 'open'}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default App;
