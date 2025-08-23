import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function GuildSelector() {
  const { guilds, selectGuild, logout, user } = useAuth();

  const handleGuildSelect = (guildId: string) => {
    selectGuild(guildId);
  };

  const handleLogout = () => {
    logout();
  };

  if (guilds.length === 0) {
    return (
      <div className="min-h-screen discord-bg-darkest flex items-center justify-center p-4">
        <Card className="w-full max-w-md discord-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-100 mb-2">
              서버를 찾을 수 없음
            </CardTitle>
            <p className="text-gray-400">
              봇이 속한 서버를 찾을 수 없습니다
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-400 text-center bg-discord-darker p-4 rounded-lg">
              <p>이 계정으로 접근 가능한 서버가 없습니다.</p>
              <p className="mt-2">봇이 설치된 서버에서 다시 시도해주세요.</p>
            </div>
            
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
              data-testid="button-logout"
            >
              다른 계정으로 로그인
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen discord-bg-darkest flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl discord-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-100 mb-2">
            서버 선택
          </CardTitle>
          <p className="text-gray-400">
            관리할 서버를 선택해주세요
          </p>
          <div className="text-xs text-gray-500 mt-2">
            {user?.username}#{user?.discriminator}로 로그인됨
            <Button
              onClick={handleLogout}
              variant="link"
              size="sm"
              className="ml-2 text-xs text-gray-400 hover:text-gray-200 p-0 h-auto"
            >
              로그아웃
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guilds.map((guild) => (
              <Card 
                key={guild.id} 
                className="discord-card hover:bg-discord-darker/50 transition-colors cursor-pointer"
                onClick={() => handleGuildSelect(guild.id)}
                data-testid={`card-guild-${guild.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    {guild.icon ? (
                      <img
                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                        alt={guild.name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-discord-blue rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {guild.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-100 truncate">
                        {guild.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {guild.owner && (
                          <Badge variant="secondary" className="text-xs">
                            소유자
                          </Badge>
                        )}
                        <span className="text-xs text-gray-400">
                          ID: {guild.id}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}