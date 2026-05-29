import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket]     = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const { user, token } = useAuth();

  useEffect(() => {
    // Connect when user is authenticated and token exists
    if (user && token) {
      const newSocket = io(
        import.meta.env.VITE_SOCKET_URL,
        {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        }
      );

      newSocket.on('connect', () => {
        console.log('[Socket] Connected:', newSocket.id);
        setConnected(true);
      });

      newSocket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
        setConnected(false);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        setConnected(false);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Cleanup on user change or logout
      return () => {
        newSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      };
    } else {
      // User logged out — ensure socket is closed
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
    }
  }, [user, token]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
