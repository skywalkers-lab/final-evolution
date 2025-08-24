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
      icon: "fas fa-chart-pie", 
      label: "대시보드",
      gradient: "from-slate-600 to-slate-700",
      iconColor: "text-blue-300",
      glowColor: "shadow-slate-500/20",
      bgColor: "bg-blue-500/10"
    },
    { 
      path: "/bank", 
      icon: "fas fa-wallet", 
      label: "은행 & 계좌",
      gradient: "from-slate-600 to-slate-700",
      iconColor: "text-green-300", 
      glowColor: "shadow-slate-500/20",
      bgColor: "bg-green-500/10"
    },
    { 
      path: "/trading", 
      icon: "fas fa-trending-up", 
      label: "주식 거래",
      gradient: "from-slate-600 to-slate-700",
      iconColor: "text-orange-300",
      glowColor: "shadow-slate-500/20",
      bgColor: "bg-orange-500/10"
    },
    { 
      path: "/auctions", 
      icon: "fas fa-gavel", 
      label: "경매",
      gradient: "from-slate-600 to-slate-700",
      iconColor: "text-purple-300",
      glowColor: "shadow-slate-500/20",
      bgColor: "bg-purple-500/10"
    },
    { 
      path: "/news", 
      icon: "fas fa-newspaper", 
      label: "뉴스 분석",
      gradient: "from-slate-600 to-slate-700",
      iconColor: "text-cyan-300",
      glowColor: "shadow-slate-500/20",
      bgColor: "bg-cyan-500/10"
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
            className={`group relative w-full flex items-center space-x-4 p-3 rounded-lg transition-all duration-300 text-left ${
              location === item.path
                ? 'bg-gray-700/80 text-white border border-gray-600/40'
                : 'text-gray-300 hover:text-white hover:bg-discord-dark/40'
            }`}
            data-testid={`nav-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {/* Active indicator */}
            {location === item.path && (
              <div className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 ${item.iconColor.replace('text-', 'bg-')} rounded-r-full`}></div>
            )}
            
            {/* Icon container */}
            <div className={`relative z-10 w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-300 border overflow-hidden ${
              location === item.path 
                ? `${item.bgColor} border-gray-500/30 ${item.glowColor} shadow-lg` 
                : 'bg-gray-700/40 border-gray-600/30 group-hover:bg-gray-600/60 group-hover:border-gray-500/40'
            }`}>
              
              {/* Background illustration */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                {item.path === "/" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                  </svg>
                )}
                {item.path === "/bank" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l7 3.5v3L12 12 5 8.5v-3L12 2zM5 10v6l7 3.5 7-3.5v-6l-7 3.5L5 10z"/>
                  </svg>
                )}
                {item.path === "/trading" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                  </svg>
                )}
                {item.path === "/auctions" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 3H3v6h18V3zM12 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM3 10v11h6v-9H3zm8 11h6v-6h-6v6zm0-8h10v-3H11v3z"/>
                  </svg>
                )}
                {item.path === "/news" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
                  </svg>
                )}
              </div>
              
              {/* Main icon */}
              <i className={`${item.icon} text-lg ${
                location === item.path ? 'text-white' : item.iconColor + ' group-hover:text-white'
              } transition-all duration-300 relative z-10`}></i>
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
