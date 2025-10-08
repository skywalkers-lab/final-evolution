import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/use-websocket';
import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TradeExecution {
  id: string;
  price: number;
  quantity: number;
  type: 'buy' | 'sell';
  timestamp: string;
  change: number; // 직전 체결가 대비 변동
}

interface TradeExecutionListProps {
  guildId: string;
  symbol: string;
}

export function TradeExecutionList({ guildId, symbol }: TradeExecutionListProps) {
  const [executions, setExecutions] = useState<TradeExecution[]>([]);

  const { data, refetch } = useQuery<TradeExecution[]>({
    queryKey: [`/api/web-client/guilds/${guildId}/stocks/${symbol}/executions`],
    enabled: !!symbol && !!guildId,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (data) {
      setExecutions(data);
    }
  }, [data]);

  // WebSocket 실시간 업데이트
  useWebSocket((event: string, eventData: any) => {
    if (event === 'trade_executed' && eventData.symbol === symbol) {
      refetch();
    }
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatPrice = (price: number) => price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatQuantity = (quantity: number) => quantity.toLocaleString('ko-KR');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">체결 내역 (Executions)</CardTitle>
        <div className="text-xs text-muted-foreground">실시간 체결 정보</div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Header */}
        <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-muted/50 text-xs font-semibold border-b">
          <div className="text-center">시간</div>
          <div className="text-right">체결가</div>
          <div className="text-right">수량</div>
          <div className="text-center">구분</div>
        </div>

        {/* Execution list */}
        <ScrollArea className="h-[400px]">
          <div className="px-4">
            {executions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                체결 내역이 없습니다
              </div>
            ) : (
              executions.map((execution, index) => {
                const prevPrice = index < executions.length - 1 ? executions[index + 1].price : execution.price;
                const change = execution.price - prevPrice;
                const isUp = change > 0;
                const isDown = change < 0;
                const priceColor = isUp ? 'text-red-600' : isDown ? 'text-blue-600' : 'text-gray-600';
                const isBuy = execution.type === 'buy';

                return (
                  <div
                    key={execution.id}
                    className={`grid grid-cols-4 gap-2 py-2 border-b last:border-b-0 hover:bg-muted/30 transition-colors ${
                      index === 0 ? 'bg-yellow-50/50' : ''
                    }`}
                  >
                    <div className="text-xs text-center text-muted-foreground">
                      {formatTime(execution.timestamp)}
                    </div>
                    <div className={`text-sm font-bold text-right ${priceColor} flex items-center justify-end gap-1`}>
                      {isUp && <span className="text-xs">▲</span>}
                      {isDown && <span className="text-xs">▼</span>}
                      {formatPrice(execution.price)}
                    </div>
                    <div className="text-sm text-right">
                      {formatQuantity(execution.quantity)}
                    </div>
                    <div className="flex justify-center">
                      <Badge
                        variant={isBuy ? 'destructive' : 'default'}
                        className="text-xs px-2 py-0"
                      >
                        {isBuy ? '매수' : '매도'}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Summary */}
        {executions.length > 0 && (
          <div className="border-t bg-muted/20 px-4 py-3">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-muted-foreground mb-1">총 체결</div>
                <div className="font-semibold">{executions.length}건</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">총 수량</div>
                <div className="font-semibold">
                  {formatQuantity(executions.reduce((sum, e) => sum + e.quantity, 0))}주
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">평균가</div>
                <div className="font-semibold">
                  ₩{formatPrice(
                    executions.reduce((sum, e) => sum + e.price * e.quantity, 0) /
                    executions.reduce((sum, e) => sum + e.quantity, 0)
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
