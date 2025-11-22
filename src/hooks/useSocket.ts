import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const useSocket = (url: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socket: Socket = io(url, {
      transports: ['websocket'],
    });
    setSocket(socket);
  }, [url]);

  return socket;
};

export { useSocket };
