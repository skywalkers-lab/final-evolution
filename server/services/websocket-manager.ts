import { WebSocketServer, WebSocket } from 'ws';

interface WebSocketClient extends WebSocket {
  guildId?: string;
  userId?: string;
  isAlive?: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<WebSocketClient> = new Set();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocketClient, request) => {
      console.log('New WebSocket connection');
      
      ws.isAlive = true;
      this.clients.add(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connected successfully'
      }));
    });

    // Setup heartbeat
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocketClient) => {
        if (ws.isAlive === false) {
          ws.terminate();
          this.clients.delete(ws);
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  private handleMessage(ws: WebSocketClient, data: any) {
    const { type, payload } = data;

    switch (type) {
      case 'authenticate':
        ws.guildId = payload.guildId;
        ws.userId = payload.userId;
        console.log(`Client authenticated for guild ${payload.guildId}`);
        break;
      
      case 'subscribe':
        // Handle subscription to specific channels
        break;
      
      default:
        console.log('Unknown message type:', type);
    }
  }

  broadcast(event: string, data: any, guildId?: string) {
    const message = JSON.stringify({
      type: 'broadcast',
      event,
      data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Filter by guild if specified
        if (!guildId || client.guildId === guildId) {
          client.send(message);
        }
      }
    });
  }

  sendToUser(userId: string, event: string, data: any) {
    const message = JSON.stringify({
      type: 'user_message',
      event,
      data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
        client.send(message);
      }
    });
  }

  getConnectedClients(guildId?: string): number {
    if (!guildId) {
      return this.clients.size;
    }
    
    let count = 0;
    this.clients.forEach((client) => {
      if (client.guildId === guildId) {
        count++;
      }
    });
    
    return count;
  }
}
