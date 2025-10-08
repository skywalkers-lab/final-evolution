import { useEffect, useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatKoreanCurrency } from "@/utils/formatCurrency";

interface CircuitBreaker {
  guildId: string;
  symbol: string;
  triggeredAt: number;
  resumeAt: number;
  reason: string;
  priceChange: number;
  level: 1 | 2 | 3;
}

interface CircuitBreakerAlertProps {
  guildId: string;
}

export default function CircuitBreakerAlert({ guildId }: CircuitBreakerAlertProps) {
  const [activeBreakers, setActiveBreakers] = useState<CircuitBreaker[]>([]);
  const [recentlyTriggered, setRecentlyTriggered] = useState<CircuitBreaker | null>(null);

  const { data: breakers = [] } = useQuery<CircuitBreaker[]>({
    queryKey: [`/api/web-client/guilds/${guildId}/circuit-breakers`],
    enabled: !!guildId,
    refetchInterval: 5000, // 5초마다 갱신
  });

  useEffect(() => {
    setActiveBreakers(breakers);
  }, [breakers]);

  // WebSocket handler for real-time circuit breaker updates
  useWebSocket((event: string, data: any) => {
    if (event === 'circuit_breaker_triggered' && data.symbol) {
      setRecentlyTriggered(data);
      setTimeout(() => setRecentlyTriggered(null), 10000); // 10초 후 알림 숨김
    } else if (event === 'circuit_breaker_resumed' && data.symbol) {
      setActiveBreakers(prev => prev.filter(b => b.symbol !== data.symbol));
    }
  });

  const getLevelColor = (level: 1 | 2 | 3) => {
    switch (level) {
      case 1: return "bg-yellow-900 text-yellow-300 border-yellow-500";
      case 2: return "bg-orange-900 text-orange-300 border-orange-500";
      case 3: return "bg-red-900 text-red-300 border-red-500";
    }
  };

  const getLevelText = (level: 1 | 2 | 3) => {
    switch (level) {
      case 1: return "레벨 1 (8%)";
      case 2: return "레벨 2 (15%)";
      case 3: return "레벨 3 (20%)";
    }
  };

  const formatTimeRemaining = (resumeAt: number) => {
    const now = Date.now();
    const remaining = Math.max(0, resumeAt - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}분 ${seconds}초`;
  };

  const [, forceUpdate] = useState({});
  
  // 남은 시간 업데이트를 위한 타이머
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (activeBreakers.length === 0 && !recentlyTriggered) {
    return (
      <div className="h-full flex items-center justify-center discord-bg-darker border border-discord-dark rounded p-2">
        <div className="text-center">
          <i className="fas fa-check-circle text-green-500 text-xl mb-1"></i>
          <p className="text-[10px] text-gray-400">정상 거래중</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* 방금 발동된 서킷브레이커 알림 */}
      {recentlyTriggered && (
        <Alert className="border-red-500 bg-red-900/20 animate-pulse mb-2 p-2">
          <div className="flex items-start gap-1">
            <i className="fas fa-exclamation-triangle text-red-500 text-xs mt-0.5"></i>
            <div className="flex-1 min-w-0">
              <AlertTitle className="text-red-300 font-bold text-[10px] mb-1">
                🚨 서킷브레이커 발동!
              </AlertTitle>
              <AlertDescription className="text-red-200 text-[9px] space-y-0.5">
                <p className="font-semibold">{recentlyTriggered.symbol} - {recentlyTriggered.reason}</p>
                <p>하락: {recentlyTriggered.priceChange}%</p>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* 활성 서킷브레이커 목록 - 초압축 */}
      {activeBreakers.length > 0 && (
        <Card className="discord-bg-darker border-discord-dark">
          <CardHeader className="p-2">
            <CardTitle className="text-white flex items-center gap-1 text-[10px]">
              <i className="fas fa-ban text-red-500 text-[9px]"></i>
              활성 서킷브레이커
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="space-y-1.5">
              {activeBreakers.map((breaker, index) => (
                <div 
                  key={`${breaker.symbol}-${breaker.triggeredAt}`}
                  className="p-1.5 rounded bg-discord-darkest border border-red-500/30"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-bold text-[10px]">{breaker.symbol}</span>
                    <Badge variant="destructive" className="text-[8px] px-1 py-0 h-4">
                      정지
                    </Badge>
                  </div>
                  
                  <div className="space-y-0.5 text-[9px]">
                    <div className="flex justify-between text-gray-400">
                      <span>하락:</span>
                      <span className="text-red-400 font-semibold">{breaker.priceChange.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>재개:</span>
                      <span className="text-yellow-400 font-mono text-[8px]">
                        {formatTimeRemaining(breaker.resumeAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
