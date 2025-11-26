import type { Socket } from 'socket.io-client';

const CallStatus = {
  IDLE: 'idle',
  READY: 'ready',
  CALLING: 'calling',
  ANSWERING: 'answering',
  INCALL: 'incall',
  ENDED: 'ended',
} as const;

interface IState {
  state: (typeof CallStatus)[keyof typeof CallStatus];
  targetUserId: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  pc: RTCPeerConnection | null;
  socket: Socket | null;
  dataChannel: RTCDataChannel | null;
  videoInputDeviceId: string;
  audioInputDeviceId: string;
}

const initialState: IState = {
  state: CallStatus.IDLE,
  targetUserId: '',
  localStream: null,
  remoteStream: null,
  pc: null,
  socket: null,
  dataChannel: null,
  videoInputDeviceId: '',
  audioInputDeviceId: '',
};

const reducer = (state: IState, action: any): IState => {
  switch (action.type) {
    case 'SET_CALL_STATUS':
      return { ...state, state: action.payload.state };
    case 'SET_LOCAL_STREAM':
      return { ...state, localStream: action.payload.localStream };
    case 'SET_REMOTE_STREAM':
      return { ...state, remoteStream: action.payload.remoteStream };
    case 'SET_PC':
      return { ...state, pc: action.payload.pc };
    case 'SET_SOCKET':
      return { ...state, socket: action.payload.socket };
    case 'SET_DATA_CHANNEL':
      return { ...state, dataChannel: action.payload.dataChannel };
    case 'SET_VIDEO_INPUT_DEVICE_ID':
      return { ...state, videoInputDeviceId: action.payload.videoInputDeviceId };
    case 'SET_AUDIO_INPUT_DEVICE_ID':
      return { ...state, audioInputDeviceId: action.payload.audioInputDeviceId };
    case 'SET_TARGET_USER_ID':
      return { ...state, targetUserId: action.payload.targetUserId };
    case 'RESET_STATE':
      return {
        ...initialState,
        socket: state.socket, // 保留 socket
      };
    default:
      return state;
  }
};

export { reducer, initialState, CallStatus };
