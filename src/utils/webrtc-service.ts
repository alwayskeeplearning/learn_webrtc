import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

const CallStatus = {
  IDLE: 'idle',
  READY: 'ready',
  CALLING: 'calling',
  ANSWERING: 'answering',
  INCALL: 'incall',
  ENDED: 'ended',
} as const;

type CallStatusType = (typeof CallStatus)[keyof typeof CallStatus];

interface IData {
  state: CallStatusType;
  userId: string;
  roomId: string;
  targetUserId: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  pc: RTCPeerConnection | null;
  socket: Socket | null;
  dataChannel: RTCDataChannel | null;
  videoInputDeviceId: string;
  audioInputDeviceId: string;
}

class WebRTCService extends EventTarget {
  private socket: Socket | null;
  private pc: RTCPeerConnection | null;
  data: IData;
  constructor() {
    super();
    this.socket = null;
    this.pc = null;
    this.data = {
      state: CallStatus.IDLE,
      userId: '',
      roomId: '',
      targetUserId: '',
      localStream: null,
      remoteStream: null,
      pc: null,
      socket: null,
      dataChannel: null,
      videoInputDeviceId: '',
      audioInputDeviceId: '',
    };
  }

  connect(userId: string, roomId: string) {
    this.data.userId = userId;
    this.data.roomId = roomId;
    this.socket = io(`wss://10.10.6.13:8080?userId=${userId}&roomId=${roomId}`, {
      transports: ['websocket'],
    });
    this.socket.on('connect', () => {
      this.dispatchEvent(new CustomEvent('connect'));
    });
    this.socket.on('disconnect', () => {
      this.dispatchEvent(new CustomEvent('disconnect'));
    });
    this.socket.on('error', error => {
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
    });
  }
}

export { WebRTCService };
