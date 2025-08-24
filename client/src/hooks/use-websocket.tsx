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

  const connect = useCallback(() => {
    // Allow connection even without user for demo/guest access
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connected");
        // Authenticate with proper user info or fallback
        ws.send(JSON.stringify({
          type: 'authenticate',
          payload: {
            guildId: selectedGuildId || '1284053249057620018', // Demo guild fallback
            userId: user?.id?.toString() || 'guest'
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'broadcast' && message.event) {
            // Call all registered handlers
            handlersRef.current.forEach(handler => {
              handler(message.event!, message.data);
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        // Attempt to reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
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

  useEffect(() => {
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { send, addHandler };
}
