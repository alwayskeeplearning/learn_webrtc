import { useState, useEffect } from 'react';

type TDeviceInfo = {
  videoInputDevices: MediaDeviceInfo[];
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
};

const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState<TDeviceInfo>({
    videoInputDevices: [],
    audioInputDevices: [],
    audioOutputDevices: [],
  });

  useEffect(() => {
    const constraints = {
      video: { width: 720, height: 480, frameRate: { ideal: 20, max: 30 } },
      audio: true,
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(stream => {
        stream.getTracks().forEach(track => {
          track.stop();
        });
        navigator.mediaDevices.enumerateDevices().then(devices => {
          const localDeviceInfo: TDeviceInfo = {
            videoInputDevices: [],
            audioInputDevices: [],
            audioOutputDevices: [],
          };
          devices.forEach(device => {
            const deviceObject = {
              deviceId: device.deviceId,
              groupId: device.groupId,
              label: device.label,
              kind: device.kind,
            } as MediaDeviceInfo;
            if (device.kind === 'videoinput') {
              if (localDeviceInfo.videoInputDevices.filter(item => item.deviceId === device.deviceId || item.groupId === device.groupId).length === 0) {
                localDeviceInfo.videoInputDevices.push(deviceObject);
              }
            } else if (device.kind === 'audioinput') {
              if (localDeviceInfo.audioInputDevices.filter(item => item.deviceId === device.deviceId || item.groupId === device.groupId).length === 0) {
                localDeviceInfo.audioInputDevices.push(deviceObject);
              }
            } else if (device.kind === 'audiooutput') {
              if (localDeviceInfo.audioOutputDevices.filter(item => item.deviceId === device.deviceId || item.groupId === device.groupId).length === 0) {
                localDeviceInfo.audioOutputDevices.push(deviceObject);
              }
            }
          });
          setDeviceInfo(localDeviceInfo);
        });
      })
      .catch(error => {
        console.error('获取设备信息失败', error);
      });
  }, []);
  return deviceInfo;
};

export type { TDeviceInfo };
export { useDeviceInfo };
