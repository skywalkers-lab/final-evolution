import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";

export default function TopBar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState(3);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // WebSocket connection status
  useWebSocket((event: string, data: any) => {
    if (event === 'connected') {
      setIsConnected(true);
    }
  });

  const formatTime = (date: Date) => {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <header className="discord-bg-darker border-b border-discord-dark p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">실시간 대시보드</h1>
          <p className="text-gray-400">서버 경제 현황 및 관리</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Real-time status indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-discord-green animate-pulse-discord' : 'bg-gray-500'}`}></div>
            <span className="text-sm text-gray-400" data-testid="text-connection-status">
              {isConnected ? '실시간 연결됨' : '연결 중...'}
            </span>
          </div>
          
          {/* Server time */}
          <div className="text-sm text-gray-400">
            <i className="fas fa-clock mr-2"></i>
            <span data-testid="text-current-time">{formatTime(currentTime)}</span>
          </div>
          
          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-white" data-testid="button-notifications">
            <i className="fas fa-bell"></i>
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-discord-red rounded-full text-xs flex items-center justify-center text-white">
                {notifications}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
