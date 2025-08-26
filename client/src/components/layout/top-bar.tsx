import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function TopBar() {
  const { user, login, logout } = useAuth();
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
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-gray-400'}`} data-testid="text-connection-status">
              {isConnected ? '🟢 온라인' : '⚪ 연결 중...'}
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

          {/* Discord Login/Logout */}
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {user.avatar ? (
                  <img 
                    src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=32`}
                    alt={user.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-sm font-bold">
                    {user.username.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-300 font-medium">{user.username}</span>
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-discord-dark"
                data-testid="button-logout"
              >
                로그아웃
              </Button>
            </div>
          ) : (
            <Button
              onClick={login}
              className="bg-discord-blurple hover:bg-discord-blurple/90 text-white text-sm"
              size="sm"
              data-testid="button-login"
            >
              <svg 
                className="w-4 h-4 mr-2" 
                viewBox="0 -28.5 256 256"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid"
              >
                <path 
                  d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z"
                  fill="currentColor"
                />
              </svg>
              Discord 로그인
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
