import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./use-auth";

interface WebSocketMessage {
  type: string;
  event?: string;
  data?: any;
  timestamp?: string;
}

type MessageHandler = (event: string, data: any) => void;

export function useWebSocket(onMessage?: MessageHandler) {
  const { user, selectedGuildId } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const shouldConnectRef = useRef(true);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || !shouldConnectRef.current) {
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }

    isConnectingRef.current = true;
    
    // Allow connection even without user for demo/guest access
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connected");
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        
        // Authenticate with proper user info or fallback
        ws.send(JSON.stringify({
          type: 'authenticate',
          payload: {
            guildId: selectedGuildId || 'unknown',
            userId: user?.id?.toString() || 'guest'
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'broadcast' && message.event) {
            // Call all registered handlers with error handling
            handlersRef.current.forEach(handler => {
              try {
                handler(message.event!, message.data);
              } catch (error) {
                console.error("Error in WebSocket message handler:", error);
              }
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected", { code: event.code, reason: event.reason });
        isConnectingRef.current = false;
        
        // Only attempt to reconnect if we should be connected and it wasn't a normal close
        if (shouldConnectRef.current && event.code !== 1000) {
          const maxRetries = 10;
          if (reconnectAttemptsRef.current < maxRetries) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff, max 30s
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxRetries})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (shouldConnectRef.current) {
                connect();
              }
            }, delay);
          } else {
            console.log("Max reconnection attempts reached");
          }
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        isConnectingRef.current = false;
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      isConnectingRef.current = false;
    }
  }, [user, selectedGuildId]);

  const addHandler = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const send = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  useEffect(() => {
    if (onMessage) {
      const removeHandler = addHandler(onMessage);
      return removeHandler;
    }
  }, [onMessage, addHandler]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    
    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Close WebSocket connection
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close(1000, 'Component unmounting'); // Normal closure
    }
    
    wsRef.current = null;
    isConnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
  }, []);

  useEffect(() => {
    shouldConnectRef.current = true;
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { send, addHandler, disconnect };
}
