import  { useRef, useEffect, useState } from 'react';
import styles from './app.less';

const App = () => {
  // 创建 Refs 来安全地引用 DOM 元素
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // 创建一个 Ref 来存储本地媒体流对象
  const localStreamRef = useRef<MediaStream | null>(null);

  // --- 按钮的 Refs ---
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const callButtonRef = useRef<HTMLButtonElement>(null);
  const hangupButtonRef = useRef<HTMLButtonElement>(null);

  // --- 共享屏幕状态 ---
  const [isSharing, setIsSharing] = useState(false);

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
  // 使用 useEffect 来处理副作用，例如添加事件监听器
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
        <button ref={callButtonRef} className={styles.button}>
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
