import { useEffect, useRef, useState } from 'react';
import VConsole from 'vconsole';
import styles from './app.less';
import { useDeviceInfo } from './hooks/useDeviceList';
import { useSocket } from './hooks/useSocket';
import { Select } from 'antd';
type TUser = {
  userId: string;
  roomId: string;
};

const userId = Math.round(Math.random() * 1000000 + 1000000).toString();
const App = () => {
  const [userList, setUserList] = useState<TUser[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const deviceInfo = useDeviceInfo();
  const socket = useSocket(`wss://localhost:8080?userId=${userId}&roomId=666`);

  useEffect(() => {
    socket?.on('message', data => {
      if (data.type === 'join') {
        if (data.data.userId === userId) return;
        setUserList(prev => [...prev, data.data]);
      }
      console.log('message', data);
    });
  }, [socket]);

  console.log(deviceInfo, socket);

  const handleVideoDeviceChange = (value: string) => {
    console.log(value);
  };

  const handleAudioDeviceChange = (value: string) => {
    console.log(value);
  };

  const handleAudioOutputDeviceChange = (value: string) => {
    console.log(value);
  };

  const handleUserChange = (value: string) => {
    console.log(value);
  };

  useEffect(() => {
    new VConsole();
  }, []);

  return (
    <div className={styles.container}>
      <label>视频设备</label>
      <Select options={deviceInfo.videoInputDevices.map(item => ({ label: item.label, value: item.deviceId }))} onChange={handleVideoDeviceChange} />
      <label>音频设备</label>
      <Select options={deviceInfo.audioInputDevices.map(item => ({ label: item.label, value: item.deviceId }))} onChange={handleAudioDeviceChange} />
      <label>音频输出设备</label>
      <Select options={deviceInfo.audioOutputDevices.map(item => ({ label: item.label, value: item.deviceId }))} onChange={handleAudioOutputDeviceChange} />
      <label>用户列表</label>
      <Select options={userList.map(item => ({ label: item.userId, value: item.userId }))} onChange={handleUserChange} />
      <video ref={videoRef} playsInline style={{ transform: 'scaleX(-1)' }} />
    </div>
  );
};

export default App;
