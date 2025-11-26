import { useEffect, useRef, useState, useReducer } from 'react';
import VConsole from 'vconsole';
import styles from './app.less';
import { useDeviceInfo } from './hooks/useDeviceList';
import { Select, Button } from 'antd';
import { reducer, initialState, CallStatus } from './reducer';
import { io, Socket } from 'socket.io-client';

type TUser = {
  userId: string;
  roomId: string;
};

const userId = Math.round(Math.random() * 1000000 + 1000000).toString();
const roomId = '666';
const url = `wss://10.10.6.13:8080?userId=${userId}&roomId=${roomId}`;
const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [userList, setUserList] = useState<TUser[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const deviceInfo = useDeviceInfo();

  const handleVideoDeviceChange = (value: string) => {
    dispatch({ type: 'SET_VIDEO_INPUT_DEVICE_ID', payload: { videoInputDeviceId: value } });
  };

  const handleAudioDeviceChange = (value: string) => {
    dispatch({ type: 'SET_AUDIO_INPUT_DEVICE_ID', payload: { audioInputDeviceId: value } });
  };

  const handleUserChange = (value: string) => {
    setTargetUserId(value);
  };

  const handleJoinRoom = () => {
    const socket: Socket = io(url, {
      transports: ['websocket'],
    });
    dispatch({ type: 'SET_SOCKET', payload: { socket } });
  };

  const handleCall = async () => {
    // const peerConnection = new RTCPeerConnection();
    // dispatch({ type: 'SET_PC', payload: { pc: peerConnection } });
    // for (const track of state.localStream!.getTracks()) {
    //   peerConnection.addTrack(track);
    // }
    // const offer = await peerConnection.createOffer();
    // await peerConnection.setLocalDescription(offer);
    dispatch({ type: 'SET_CALL_STATUS', payload: { state: CallStatus.CALLING } });
    state.socket!.emit('call', {
      targetUserId,
      roomId,
      userId,
    });
  };

  const handleAnswer = async () => {
    const pc = new RTCPeerConnection();
    dispatch({ type: 'SET_CALL_STATUS', payload: { state: CallStatus.INCALL } });
    dispatch({ type: 'SET_PC', payload: { pc } });
    const constraints = {
      video: { deviceId: state.videoInputDeviceId },
      audio: { deviceId: state.audioInputDeviceId },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    dispatch({ type: 'SET_LOCAL_STREAM', payload: { localStream: stream } });
    for (const track of stream.getTracks()) {
      pc.addTrack(track);
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    state.socket!.emit('offer', {
      targetUserId: state.targetUserId,
      roomId,
      userId,
      offer,
    });
  };

  const handleReject = () => {
    // dispatch({ type: 'SET_CALL_STATUS', payload: { state: CallStatus.ENDED } });
    // state.socket!.emit('reject', {
    //   targetUserId,
    //   roomId,
    // });
  };

  useEffect(() => {
    new VConsole();
  }, []);

  // useEffect(() => {
  //   if (!state.videoInputDeviceId || !state.audioInputDeviceId) {
  //     return;
  //   }
  //   const createLocalStream = async () => {
  //     const constraints = {
  //       video: { deviceId: state.videoInputDeviceId },
  //       audio: { deviceId: state.audioInputDeviceId },
  //     };
  //     const stream = await navigator.mediaDevices.getUserMedia(constraints);
  //     dispatch({ type: 'SET_LOCAL_STREAM', payload: { localStream: stream } });
  //   };
  //   createLocalStream();
  // }, [state.videoInputDeviceId, state.audioInputDeviceId]);

  useEffect(() => {
    if (!state.socket) {
      return;
    }
    dispatch({ type: 'SET_CALL_STATUS', payload: { state: CallStatus.READY } });
    state.socket.emit('roomUserList', { roomId });
    state.socket.on('roomUserList', data => {
      console.log(data);
      const tmp = data.filter((item: any) => item.userId !== userId);
      setUserList(tmp);
    });
    state.socket.on('join', data => {
      if (data.payload.userId === userId) return;
      setUserList(prev => [...prev, data.payload]);
    });
    state.socket.on('call', data => {
      if (data.payload.toUserId !== userId) return;
      dispatch({ type: 'SET_CALL_STATUS', payload: { state: CallStatus.ANSWERING } });
      dispatch({ type: 'SET_TARGET_USER_ID', payload: { targetUserId: data.payload.fromUserId } });
    });
    state.socket.on('offer', async data => {
      const offer = data.payload.offer;
      const pc = new RTCPeerConnection();
      dispatch({ type: 'SET_PC', payload: { pc } });
      const constraints = {
        video: { deviceId: state.videoInputDeviceId },
        audio: { deviceId: state.audioInputDeviceId },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      dispatch({ type: 'SET_LOCAL_STREAM', payload: { localStream: stream } });
      for (const track of stream.getTracks()) {
        pc.addTrack(track);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      state.socket!.emit('answer', {
        targetUserId,
        roomId,
        userId,
        answer,
      });
      state.socket!.on('answer', async data => {
        const answer = data.payload.answer;
        const pc = state.pc!;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });
    });
  }, [state.socket, state.videoInputDeviceId, state.audioInputDeviceId, targetUserId]);
  useEffect(() => {
    if (state.localStream) {
      videoRef.current!.srcObject = state.localStream;
      videoRef.current!.play();
    }
  }, [state.localStream]);
  // useEffect(() => {
  //   if (!state.pc || !state.localStream) {
  //     return;
  //   }
  //   const pc = state.pc!;
  //   const localStream = state.localStream!;
  //   const createOffer = async () => {};
  //   createOffer();
  // }, [state.pc, state.localStream, state.socket, targetUserId]);

  return (
    <div className={styles.container}>
      <div>用户ID: {userId}</div>
      <div>视频设备</div>
      <Select options={deviceInfo.videoInputDevices.map(item => ({ label: item.label, value: item.deviceId }))} onChange={handleVideoDeviceChange} />
      <div>音频设备</div>
      <Select options={deviceInfo.audioInputDevices.map(item => ({ label: item.label, value: item.deviceId }))} onChange={handleAudioDeviceChange} />
      <div>用户列表</div>
      <Select options={userList.map(item => ({ label: item.userId, value: item.userId }))} onChange={handleUserChange} />
      <Button disabled={state.state !== CallStatus.IDLE} type="primary" onClick={handleJoinRoom}>
        加入房间
      </Button>
      <Button disabled={state.state !== CallStatus.READY || !targetUserId} onClick={handleCall}>
        呼叫
      </Button>
      {state.state === CallStatus.ANSWERING && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: 'rgb(50 136 229);', fontSize: '24px' }}>来自用户{state.targetUserId}的呼叫</div>
          <Button type="primary" style={{ marginRight: '20px', minWidth: '160px' }} onClick={handleAnswer}>
            接听
          </Button>
          <Button type="primary" danger style={{ marginRight: '20px', minWidth: '160px' }} onClick={handleReject}>
            拒绝
          </Button>
        </div>
      )}
      <div>本地视频</div>
      <video ref={videoRef} playsInline style={{ transform: 'scaleX(-1)', maxWidth: '480px' }} />
      <div>远程视频</div>
      <video ref={remoteVideoRef} playsInline style={{ transform: 'scaleX(-1)', maxWidth: '480px' }} />
    </div>
  );
};

export default App;
