import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, guilds, selectedGuildId, selectGuild, logout } = useAuth();

  const selectedGuild = guilds.find(g => g.id === selectedGuildId);

  const menuItems = [
    { 
      path: "/", 
      icon: "fas fa-tachometer-alt", 
      label: "대시보드",
      gradient: "from-blue-500 to-purple-600",
      iconColor: "text-blue-400",
      glowColor: "shadow-blue-500/30",
      bgIcon: "📊"
    },
    { 
      path: "/bank", 
      icon: "fas fa-coins", 
      label: "은행 & 계좌",
      gradient: "from-green-500 to-emerald-600",
      iconColor: "text-green-400", 
      glowColor: "shadow-green-500/30",
      bgIcon: "🏦"
    },
    { 
      path: "/trading", 
      icon: "fas fa-chart-line", 
      label: "주식 거래",
      gradient: "from-orange-500 to-red-600",
      iconColor: "text-orange-400",
      glowColor: "shadow-orange-500/30",
      bgIcon: "📈"
    },
    { 
      path: "/auctions", 
      icon: "fas fa-hammer", 
      label: "경매",
      gradient: "from-purple-500 to-pink-600",
      iconColor: "text-purple-400",
      glowColor: "shadow-purple-500/30",
      bgIcon: "🔨"
    },
    { 
      path: "/news", 
      icon: "fas fa-rss", 
      label: "뉴스 분석",
      gradient: "from-cyan-500 to-teal-600",
      iconColor: "text-cyan-400",
      glowColor: "shadow-cyan-500/30",
      bgIcon: "📰"
    },
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
      <nav className="flex-1 px-4 py-6 space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className={`group relative w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 text-left overflow-hidden ${
              location === item.path
                ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg ${item.glowColor} transform scale-[1.02]`
                : 'text-gray-300 hover:text-white hover:bg-discord-dark/60 hover:scale-[1.01] hover:shadow-md'
            }`}
            data-testid={`nav-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {/* Background overlay for hover effect */}
            <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${location === item.path ? 'opacity-100' : ''}`}></div>
            
            {/* Active indicator */}
            {location === item.path && (
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
            )}
            
            {/* Icon container */}
            <div className={`relative z-10 w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 overflow-hidden ${
              location === item.path 
                ? `bg-gradient-to-br ${item.gradient} shadow-lg ${item.glowColor} shadow-2xl` 
                : 'bg-gray-700/50 group-hover:bg-gray-600/80'
            }`}>
              {/* Background emoji */}
              {location === item.path && (
                <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-20 animate-pulse">
                  {item.bgIcon}
                </div>
              )}
              
              {/* Main icon */}
              <i className={`${item.icon} text-xl ${
                location === item.path ? 'text-white drop-shadow-sm' : item.iconColor + ' group-hover:text-white'
              } transition-all duration-300 relative z-10`}></i>
              
              {/* Shine effect */}
              {location === item.path && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              )}
            </div>
            
            {/* Label */}
            <span className="relative z-10 font-medium transition-all duration-300">
              {item.label}
            </span>
            
            {/* Sparkle effect for active item */}
            {location === item.path && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            )}
          </button>
        ))}
        
        {/* Admin Section */}
        {false && (
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
