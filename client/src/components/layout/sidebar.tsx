import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { path: "/", icon: "fas fa-chart-line", label: "대시보드", active: location === "/" },
    { path: "/bank", icon: "fas fa-university", label: "은행 & 계좌" },
    { path: "/trading", icon: "fas fa-chart-candlestick", label: "주식 거래" },
    { path: "/auctions", icon: "fas fa-gavel", label: "경매" },
    { path: "/news", icon: "fas fa-newspaper", label: "뉴스 분석" },
    { path: "/tax", icon: "fas fa-coins", label: "세금 관리" },
  ];

  const adminItems = [
    { path: "/admin/settings", icon: "fas fa-cog", label: "봇 설정" },
    { path: "/admin/users", icon: "fas fa-users-cog", label: "사용자 관리" },
    { path: "/admin/audit", icon: "fas fa-clipboard-list", label: "감사 로그" },
  ];

  return (
    <div className="w-64 discord-bg-darker border-r border-discord-dark flex flex-col">
      {/* Discord Bot Header */}
      <div className="p-6 border-b border-discord-dark">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-discord-blue rounded-full flex items-center justify-center">
            <i className="fas fa-robot text-white text-lg"></i>
          </div>
          <div>
            <h2 className="font-semibold text-white">경제봇 대시보드</h2>
            <p className="text-sm text-gray-400" data-testid="text-server-name">
              Server: {user?.guildId?.slice(0, 8) || '한국 경제'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${
              item.active
                ? 'bg-discord-blue text-white'
                : 'text-gray-300 hover:bg-discord-dark hover:text-white'
            }`}
            data-testid={`nav-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <i className={`${item.icon} w-5`}></i>
            <span>{item.label}</span>
          </button>
        ))}
        
        {/* Admin Section */}
        {user?.isAdmin && (
          <div className="pt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              관리자 기능
            </h3>
            {adminItems.map((item) => (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className="w-full flex items-center space-x-3 p-3 rounded-lg text-gray-300 hover:bg-discord-dark hover:text-white transition-colors text-left"
                data-testid={`nav-admin-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <i className={`${item.icon} w-5`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-discord-dark">
        <div className="flex items-center space-x-3">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64" 
            alt="User avatar" 
            className="w-10 h-10 rounded-full" 
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate" data-testid="text-user-info">
              관리자#{user?.guildId?.slice(-4) || '1234'}
            </p>
            <p className="text-xs text-gray-400">온라인</p>
          </div>
          <button 
            onClick={logout}
            className="text-gray-400 hover:text-white"
            data-testid="button-logout"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
