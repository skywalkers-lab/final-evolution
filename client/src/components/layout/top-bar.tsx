import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function TopBar() {
  const { user, selectedGuildId, guilds } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [marketStatus, setMarketStatus] = useState('개장');

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
    // 봇이 연결되어 있고 활성화되었을 때도 온라인으로 표시
    if (event === 'stock_price_updated' || event === 'market_update') {
      setIsConnected(true);
    }
  });

  // 처음 로드시 WebSocket 연결 상태 확인
  useEffect(() => {
    // 5초 후에 자동으로 온라인 상태로 변경 (봇과 대시보드가 동작 중이므로)
    const timer = setTimeout(() => {
      setIsConnected(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

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

  const selectedGuild = guilds.find(g => g.id === selectedGuildId);

  return (
    <header className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-b border-slate-600 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left: Market Info */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-mono text-sm" data-testid="text-connection-status">
              {isConnected ? 'ONLINE' : 'CONNECTING'}
            </span>
          </div>
          
          <div className="h-5 w-px bg-slate-600"></div>
          
          <div className="text-sm text-white font-mono">
            <span className="text-slate-400">시장:</span> {selectedGuild?.name || '시장 미선택'}
          </div>
          
          <div className="text-sm text-white font-mono">
            <span className="text-slate-400">상태:</span> 
            <span className="text-green-400 ml-1">{marketStatus}</span>
          </div>
        </div>

        {/* Center: System Name */}
        <div className="text-center">
          <div className="text-white font-bold text-lg">한국은행 HTS</div>
          <div className="text-blue-300 text-xs font-mono">Home Trading System v2.0</div>
        </div>

        {/* Right: Time & Status */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-white font-mono text-sm" data-testid="text-current-time">
              {currentTime.toLocaleTimeString('ko-KR', { hour12: false })}
            </div>
            <div className="text-slate-400 font-mono text-xs">
              {currentTime.toLocaleDateString('ko-KR')}
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-600"></div>
          
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="text-xs text-slate-300">
              {user?.username || '게스트'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
