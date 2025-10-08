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
      icon: "📊", 
      label: "시장현황",
      code: "DASHBOARD"
    },
    { 
      path: "/b", 
      icon: "🏦", 
      label: "계좌관리",
      code: "BANK"
    },
    { 
      path: "/stock", 
      icon: "📈", 
      label: "주식거래",
      code: "STOCK"
    },
    { 
      path: "/s", 
      icon: "💹", 
      label: "간편거래",
      code: "QUICK"
    },
    { 
      path: "/a", 
      icon: "🔨", 
      label: "경매참여",
      code: "AUCTION"
    },
    { 
      path: "/n", 
      icon: "📰", 
      label: "시장뉴스",
      code: "NEWS"
    },
  ];

  const adminItems = [
    { path: "/admin/settings", icon: "⚙️", label: "시스템 설정" },
    { path: "/admin/users", icon: "👥", label: "사용자 관리" },
    { path: "/admin/audit", icon: "📋", label: "거래 로그" },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-600 flex flex-col text-white">
      {/* HTS Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 p-3 border-b border-slate-600">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-blue-900 font-bold text-sm">KRB</span>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white text-sm">한국은행 HTS</h2>
            <p className="text-blue-200 text-xs">Home Trading System</p>
          </div>
          <div className="text-green-400 text-xs font-mono">
            <div>●온라인</div>
          </div>
        </div>
        
        {/* Market Selection */}
        {guilds.length > 0 && (
          <div className="mt-3">
            <label className="text-xs font-medium text-blue-200 mb-1 block">시장 선택</label>
            <Select value={selectedGuildId || ""} onValueChange={selectGuild}>
              <SelectTrigger className="w-full bg-slate-700 border border-slate-500 text-white text-sm h-8">
                <SelectValue placeholder="시장을 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {guilds.map((guild) => (
                  <SelectItem key={guild.id} value={guild.id} className="text-white hover:bg-slate-700">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="truncate font-mono text-xs">{guild.name}</span>
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

      {/* HTS Menu */}
      <nav className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium border-l-3 transition-all ${
                location === item.path
                  ? 'bg-blue-600/20 text-white border-l-blue-400 border-r border-r-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50 border-l-transparent hover:border-l-slate-500'
              }`}
              data-testid={`nav-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                {location === item.path && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                )}
                <span className="text-xs font-mono text-slate-400">{item.code}</span>
              </div>
            </button>
          ))}
        </div>
        
        {/* Admin Section - HTS Style */}
        {false && (
          <div className="mt-6 pt-4 border-t border-slate-600">
            <div className="text-xs text-slate-400 mb-2 px-3 font-mono">SYSTEM</div>
            <div className="space-y-1">
              {adminItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-400 hover:text-amber-300 hover:bg-slate-700/50 transition-colors"
                  data-testid={`nav-admin-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <div className="flex items-center space-x-3">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <div className="w-1 h-1 bg-amber-400 rounded-full opacity-50"></div>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User Status - HTS Style */}
      <div className="bg-slate-800 border-t border-slate-600 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <div className="text-xs font-medium text-white" data-testid="text-user-info">
                {user?.username || '사용자'}
              </div>
              <div className="text-xs text-green-400 font-mono">● 접속중</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-xs text-slate-400 font-mono">
              {new Date().toLocaleTimeString('ko-KR', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <button 
              onClick={logout}
              className="text-slate-400 hover:text-red-400 transition-colors"
              data-testid="button-logout"
              title="로그아웃"
            >
              ⏻
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
