import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, Unlink, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface RobloxLinkingProps {
  guildId: string;
  discordUserId: string;
}

export default function RobloxLinking({ guildId, discordUserId }: RobloxLinkingProps) {
  const [robloxUsername, setRobloxUsername] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkStatus, setLinkStatus] = useState<{
    isLinked: boolean;
    robloxUserId?: string;
    robloxUsername?: string;
  } | null>(null);

  // Check link status on mount
  useState(() => {
    checkLinkStatus();
  });

  const checkLinkStatus = async () => {
    try {
      const response = await fetch(`/api/roblox/link/status?discordId=${discordUserId}&guildId=${guildId}`);
      if (response.ok) {
        const data = await response.json();
        setLinkStatus(data);
      }
    } catch (error) {
      console.error('Failed to check link status:', error);
    }
  };

  const handleRequestLink = async () => {
    if (!robloxUsername.trim()) {
      toast.error('Roblox 사용자명을 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/roblox/link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          discordUserId,
          robloxUsername,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLinkCode(data.code);
        toast.success('연동 코드가 생성되었습니다!');
      } else {
        const error = await response.json();
        toast.error(error.message || '연동 요청에 실패했습니다');
      }
    } catch (error) {
      toast.error('네트워크 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('정말로 Roblox 연동을 해제하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/roblox/link/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          discordUserId,
        }),
      });

      if (response.ok) {
        setLinkStatus({ isLinked: false });
        setLinkCode('');
        toast.success('Roblox 연동이 해제되었습니다');
      } else {
        const error = await response.json();
        toast.error(error.message || '연동 해제에 실패했습니다');
      }
    } catch (error) {
      toast.error('네트워크 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('클립보드에 복사되었습니다');
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Roblox 계정 연동
        </CardTitle>
        <CardDescription>
          Roblox 게임과 Discord 계정을 연동하여 게임 내에서 경제 시스템을 사용하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Link Status */}
        {linkStatus?.isLinked ? (
          <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-green-400">연동됨</span>
              </div>
              <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-700">
                활성
              </Badge>
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Roblox 사용자: <span className="font-mono text-white">{linkStatus.robloxUsername}</span></p>
              <p>Roblox ID: <span className="font-mono text-white">{linkStatus.robloxUserId}</span></p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleUnlink}
              disabled={isLoading}
              className="mt-3 w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Unlink className="w-4 h-4 mr-2" />
                  연동 해제
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not linked */}
            <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold text-yellow-400">연동되지 않음</span>
              </div>
              <p className="text-sm text-gray-300">
                아래에서 Roblox 사용자명을 입력하고 연동을 시작하세요
              </p>
            </div>

            {/* Link Form */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="roblox-username" className="text-gray-200">
                  Roblox 사용자명
                </Label>
                <Input
                  id="roblox-username"
                  type="text"
                  placeholder="Roblox 사용자명 입력"
                  value={robloxUsername}
                  onChange={(e) => setRobloxUsername(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                  disabled={isLoading || !!linkCode}
                />
              </div>

              {!linkCode ? (
                <Button
                  onClick={handleRequestLink}
                  disabled={isLoading || !robloxUsername.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      연동 코드 생성
                    </>
                  )}
                </Button>
              ) : (
                <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg space-y-3">
                  <div>
                    <Label className="text-blue-400 mb-2 block">연동 코드</Label>
                    <div className="flex gap-2">
                      <Input
                        value={linkCode}
                        readOnly
                        className="bg-gray-900 border-gray-700 text-white font-mono text-lg"
                      />
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(linkCode)}
                      >
                        복사
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 space-y-2">
                    <p className="font-semibold text-blue-400">다음 단계:</p>
                    <ol className="list-decimal list-inside space-y-1 pl-2">
                      <li>위 코드를 복사하세요</li>
                      <li>Roblox 게임에 접속하세요</li>
                      <li>게임 내 연동 메뉴에서 코드를 입력하세요</li>
                      <li>15분 이내에 입력하지 않으면 만료됩니다</li>
                    </ol>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLinkCode('');
                      setRobloxUsername('');
                    }}
                    className="w-full"
                  >
                    취소
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="pt-4 border-t border-gray-700">
          <h4 className="font-semibold text-sm text-gray-200 mb-2">연동 방법</h4>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Roblox 게임에서 Discord 계정과 연동할 수 있습니다</li>
            <li>연동 후 게임 내에서 경제 활동을 할 수 있습니다</li>
            <li>보안을 위해 연동 코드는 15분 후 자동 만료됩니다</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
