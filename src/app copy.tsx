import { useEffect, useRef } from 'react';
import VConsole from 'vconsole';
import styles from './app.less';

const App = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // 1. 增加一个 Canvas 用于处理画面

  const startStream = async () => {
    // 2. 获取原始摄像头流
    const constraints = { 
      video: { facingMode: 'user', width: 720, height: 480, frameRate: { ideal: 20, max: 30 } }, 
      audio: false 
    };
    const rawStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // 创建一个隐藏的 video 元素来播放原始流，作为 Canvas 的源
    const rawVideo = document.createElement('video');
    rawVideo.srcObject = rawStream;
    rawVideo.playsInline = true;
    rawVideo.muted = true;
    await rawVideo.play();

    // 3. 开始在 Canvas 上绘制
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    
    // 设置 Canvas 尺寸与视频一致
    canvas.width = rawVideo.videoWidth;
    canvas.height = rawVideo.videoHeight;

    // 动画循环函数
    const draw = () => {
      // A. 绘制摄像头画面（底图）
      // 在绘制到底图之前，先做个水平翻转，实现镜像
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(rawVideo, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // B. 在画面上画个简单的图形 (比如一个会动的红色方块)
      const time = Date.now() / 1000;
      const x = 50 + Math.sin(time * 2) * 20; // 让它左右摇摆
      
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // 半透明红色
      ctx.fillRect(x, 50, 100, 100); // 绘制方块
      
      ctx.fillStyle = 'white';
      ctx.font = '30px Arial';
      ctx.fillText('Hello WebRTC!', x, 120); // 写点字

      requestAnimationFrame(draw); // 下一帧继续
    };
    
    draw(); // 启动循环

    // 4. 从 Canvas 获取处理后的新流
    // 30fps
    const processedStream = canvas.captureStream(30); 

    // 5. 将处理后的流播放出来（如果是 WebRTC 通话，这里就是把 processedStream 传给 PeerConnection）
    videoRef.current!.srcObject = processedStream;
    videoRef.current!.play();
  };

  useEffect(() => {
    new VConsole();
    startStream();
  }, []);

  return (
    <div className={styles.container}>
      {/* 
         注意：这里展示的是 canvas 处理后的流。
         我们在 Canvas 里已经做了镜像翻转(scale(-1, 1))，
         所以这里不需要 CSS transform 了，否则会负负得正又反回去。
      */}
      <video ref={videoRef} playsInline />
      
      {/* 用于处理画面的 Canvas，可以隐藏，也可以显示出来调试 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default App;
