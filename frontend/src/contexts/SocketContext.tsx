import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface SocketMessage {
  type: string;
  payload: any;
}

interface SocketContextType {
  isConnected: boolean;
  lastMessage: SocketMessage | null;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  lastMessage: null,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<SocketMessage | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8095/ws';
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          setIsConnected(true);
        };

        socket.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        socket.onerror = () => {
          setIsConnected(false);
        };

        socket.onmessage = (event) => {
          try {
            const data: SocketMessage = JSON.parse(event.data);
            setLastMessage(data);

            // Invalidate relevant queries so UI refreshes instantaneously without manual polling!
            if (data.type.includes('RESERVATION')) {
              queryClient.invalidateQueries({ queryKey: ['reservations'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              queryClient.invalidateQueries({ queryKey: ['arrivals'] });
              queryClient.invalidateQueries({ queryKey: ['in_house'] });
            }
            if (data.type.includes('ROOM') || data.type.includes('CHECK_IN') || data.type.includes('CHECK_OUT')) {
              queryClient.invalidateQueries({ queryKey: ['rooms'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              queryClient.invalidateQueries({ queryKey: ['arrivals'] });
              queryClient.invalidateQueries({ queryKey: ['departures'] });
              queryClient.invalidateQueries({ queryKey: ['in_house'] });
              queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
            }
            if (data.type.includes('HOUSEKEEPING')) {
              queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
              queryClient.invalidateQueries({ queryKey: ['rooms'] });
            }
            if (data.type.includes('ORDER') || data.type.includes('FOLIO')) {
              queryClient.invalidateQueries({ queryKey: ['orders'] });
              queryClient.invalidateQueries({ queryKey: ['invoices'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            }
          } catch (e) {
            console.error('Failed to parse websocket message', e);
          }
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, [queryClient]);

  return (
    <SocketContext.Provider value={{ isConnected, lastMessage }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

