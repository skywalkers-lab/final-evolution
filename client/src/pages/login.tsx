import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Login() {
  const [guildId, setGuildId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guildId || !password) {
      toast({
        title: "입력 오류",
        description: "길드 ID와 비밀번호를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await login(guildId, password);
      
      if (success) {
        toast({
          title: "로그인 성공",
          description: "관리자 대시보드에 오신 것을 환영합니다.",
        });
      } else {
        toast({
          title: "로그인 실패",
          description: "길드 ID 또는 비밀번호가 올바르지 않습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "로그인 오류",
        description: "로그인 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen discord-bg-darkest flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-discord-darker border-discord-dark">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-discord-blue rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-robot text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">경제봇 대시보드</h1>
            <p className="text-gray-400 text-center">관리자 인증이 필요합니다</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="guildId" className="text-gray-300">
                길드 ID
              </Label>
              <Input
                id="guildId"
                type="text"
                value={guildId}
                onChange={(e) => setGuildId(e.target.value)}
                placeholder="Discord 서버 ID를 입력하세요"
                className="bg-discord-dark border-discord-dark text-white placeholder-gray-500"
                data-testid="input-guild-id"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-300">
                관리자 비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="관리자 비밀번호를 입력하세요"
                className="bg-discord-dark border-discord-dark text-white placeholder-gray-500"
                data-testid="input-password"
                disabled={isLoading}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-discord-blue hover:bg-blue-600 text-white font-medium py-3"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  로그인 중...
                </div>
              ) : (
                "로그인"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            <p>Discord 서버의 관리자 비밀번호로 로그인하세요.</p>
            <p className="mt-2">봇이 설정되지 않은 경우 "/설정" 명령을 사용하세요.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
