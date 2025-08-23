import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, guilds, selectedGuildId, selectGuild, logout } = useAuth();

  const selectedGuild = guilds.find(g => g.id === selectedGuildId);

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
      {/* Bank of Korea Header */}
      <div className="p-6 border-b border-discord-dark">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center border-2 border-yellow-400">
            <i className="fas fa-university text-white text-lg"></i>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white text-lg">한국은행 종합서비스센터</h2>
            <p className="text-xs text-yellow-300 font-medium">Bank of Korea Service Center</p>
          </div>
        </div>
        
        {/* Server Selection */}
        {guilds.length > 0 && (
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-400 mb-2 block">서버 선택</label>
            <Select value={selectedGuildId || ""} onValueChange={selectGuild}>
              <SelectTrigger className="w-full bg-discord-dark border-discord-light text-white">
                <SelectValue placeholder="서버를 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-discord-darker border-discord-light">
                {guilds.map((guild) => (
                  <SelectItem key={guild.id} value={guild.id} className="text-white hover:bg-discord-dark">
                    <div className="flex items-center space-x-2">
                      {guild.icon ? (
                        <img 
                          src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=32`}
                          alt={guild.name}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-discord-blue rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{guild.name.charAt(0)}</span>
                        </div>
                      )}
                      <span className="truncate">{guild.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {guilds.length === 0 && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-300">
              <i className="fas fa-exclamation-triangle text-sm"></i>
              <span className="text-xs font-medium">봇이 서버에 추가되지 않았습니다</span>
            </div>
            <p className="text-xs text-yellow-400 mt-1">Discord에서 봇을 서버에 초대해주세요.</p>
          </div>
        )}
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
            src={user?.avatar 
              ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=64`
              : `https://cdn.discordapp.com/embed/avatars/${parseInt(user?.discriminator || '0') % 5}.png`
            }
            alt="User avatar" 
            className="w-10 h-10 rounded-full" 
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate" data-testid="text-user-info">
              {user?.username}#{user?.discriminator}
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
