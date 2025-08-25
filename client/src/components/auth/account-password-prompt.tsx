import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Server } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface AccountPasswordPromptProps {
  guildName?: string;
  onAuthenticated: () => void;
}

export default function AccountPasswordPrompt({ guildName, onAuthenticated }: AccountPasswordPromptProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { selectedGuildId, selectGuild } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/web-client/guilds/${selectedGuildId}/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        onAuthenticated();
      } else {
        const data = await response.json();
        setError(data.message || "비밀번호가 올바르지 않습니다.");
      }
    } catch (error) {
      console.error("Auth error:", error);
      setError("인증 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    selectGuild("");  // Clear guild selection to go back to guild selector
  };

  return (
    <div className="min-h-screen discord-bg-darkest flex items-center justify-center p-4">
      <Card className="w-full max-w-md discord-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Server className="w-12 h-12 text-discord-blurple" />
              <Lock className="w-6 h-6 text-yellow-400 absolute -bottom-1 -right-1 bg-discord-darker rounded-full p-1" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-100 mb-2">
            계좌 인증
          </CardTitle>
          <p className="text-gray-400">
            <span className="text-discord-blurple font-medium">
              {guildName || "서버"}
            </span> 계좌에 접근하려면 비밀번호를 입력해주세요
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 font-medium">
                계좌 비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="계좌 비밀번호를 입력하세요"
                className="bg-discord-darker border-discord-dark text-white placeholder-gray-500 focus:border-discord-blurple"
                disabled={isLoading}
                data-testid="input-password"
                autoFocus
              />
            </div>

            {error && (
              <Alert className="bg-red-900/20 border-red-700 text-red-300">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full bg-discord-blurple hover:bg-discord-blurple/80 text-white font-medium"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "인증 중..." : "대시보드 접속"}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="w-full border-discord-dark text-gray-300 hover:bg-discord-darker"
                disabled={isLoading}
                data-testid="button-back"
              >
                다른 서버 선택
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-discord-darker rounded-lg">
            <p className="text-xs text-gray-400 text-center">
              💡 <strong>비밀번호를 잊으셨나요?</strong>
            </p>
            <p className="text-xs text-gray-500 text-center mt-1">
              디스코드에서 <code className="bg-discord-darkest px-2 py-1 rounded">/은행 계좌개설</code> 명령어로 새 계좌를 생성하거나<br />
              관리자에게 문의해주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}