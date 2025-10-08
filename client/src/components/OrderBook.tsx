import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';

interface OrderBookEntry {
  price: number;
  quantity: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  timestamp: string;
}

interface OrderBookProps {
  guildId: string;
  symbol: string;
  depth?: number;
  onPriceClick?: (price: number) => void;
}

export function OrderBook({ guildId, symbol, depth = 10, onPriceClick }: OrderBookProps) {
  const [flashPrices, setFlashPrices] = useState<Set<number>>(new Set());
  const { data, isLoading, refetch, error } = useQuery<OrderBookData>({
    queryKey: [`/api/web-client/guilds/${guildId}/stocks/${symbol}/orderbook?depth=${depth}`],
    refetchInterval: 1000, // Refresh every 1 second for faster updates
    enabled: !!symbol && !!guildId, // Only fetch when symbol and guildId are available
  });

  // Debug logging
  useEffect(() => {
    console.log('[OrderBook] Symbol:', symbol, 'GuildId:', guildId);
    console.log('[OrderBook] Data:', data);
    console.log('[OrderBook] Loading:', isLoading);
    console.log('[OrderBook] Error:', error);
  }, [symbol, guildId, data, isLoading, error]);

  // WebSocket subscription for real-time updates
  useWebSocket((event: string, eventData: any) => {
    if (event === 'order_book_updated' && eventData.symbol === symbol && eventData.guildId === guildId) {
      refetch();
    }
    if (event === 'trade_executed' && eventData.symbol === symbol) {
      // Flash the price that was just executed
      const price = eventData.price;
      setFlashPrices(prev => new Set(prev).add(price));
      setTimeout(() => {
        setFlashPrices(prev => {
          const newSet = new Set(prev);
          newSet.delete(price);
          return newSet;
        });
      }, 500);
      refetch();
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>호가창 (Order Book)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>호가창 (Order Book)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">데이터를 불러올 수 없습니다</div>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (price: number) => price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatQuantity = (quantity: number) => quantity.toLocaleString('ko-KR');

  // Calculate total volume at each price level
  const calculateBarWidth = (quantity: number, maxQuantity: number) => {
    return (quantity / maxQuantity) * 100;
  };

  const maxQuantity = Math.max(
    ...data.asks.map(a => a.quantity),
    ...data.bids.map(b => b.quantity),
    1
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">호가창 - {symbol}</CardTitle>
          <div className="flex gap-2 items-center">
            {data.spread !== null && data.bestBid && data.bestAsk && (
              <Badge variant="outline" className="text-xs">
                스프레드 {formatPrice(data.spread)} ({((data.spread / ((data.bestBid + data.bestAsk) / 2)) * 100).toFixed(2)}%)
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {depth}호가
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Header */}
        <div className="grid grid-cols-6 gap-2 px-3 py-2 bg-muted/50 text-xs font-semibold border-b">
          <div className="col-span-2 text-center">매도잔량</div>
          <div className="col-span-2 text-center">가격</div>
          <div className="col-span-2 text-center">매수잔량</div>
        </div>

        <div className="space-y-0">
          {/* Asks (매도) - 낮은 가격부터 표시 (역순) */}
          <div>
            {data.asks.length === 0 ? (
              <div className="text-center text-muted-foreground py-2 text-sm">매도 호가 없음</div>
            ) : (
              data.asks.slice().reverse().map((ask, index) => {
                const isFlashing = flashPrices.has(ask.price);
                return (
                  <div 
                    key={`ask-${index}`} 
                    className={`relative grid grid-cols-6 gap-2 px-3 py-1.5 hover:bg-red-50/50 transition-all cursor-pointer border-b border-red-100/30 ${
                      isFlashing ? 'animate-pulse bg-yellow-100' : ''
                    }`}
                    onClick={() => onPriceClick?.(ask.price)}
                  >
                    {/* Bar chart background */}
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-red-500/10"
                      style={{ width: `${calculateBarWidth(ask.quantity, maxQuantity)}%` }}
                    />
                    
                    <div className="col-span-2 text-right font-semibold text-sm relative z-10">
                      {formatQuantity(ask.quantity)}
                    </div>
                    <div className="col-span-2 text-center font-bold text-red-600 relative z-10">
                      {formatPrice(ask.price)}
                    </div>
                    <div className="col-span-2"></div>
                  </div>
                );
              })
            )}
          </div>

          {/* Current spread indicator */}
          <div className="border-y-2 border-yellow-400 bg-yellow-50/50 py-3">
            <div className="grid grid-cols-3 gap-2 px-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">최우선 매수</div>
                <div className="text-sm font-bold text-blue-600">
                  {data.bestBid ? formatPrice(data.bestBid) : '-'}
                </div>
              </div>
              <div className="text-center border-x">
                <div className="text-xs text-muted-foreground mb-1">호가스프레드</div>
                <div className="text-sm font-bold">
                  {data.spread !== null ? formatPrice(data.spread) : '-'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">최우선 매도</div>
                <div className="text-sm font-bold text-red-600">
                  {data.bestAsk ? formatPrice(data.bestAsk) : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Bids (매수) - 높은 가격부터 표시 */}
          <div>
            {data.bids.length === 0 ? (
              <div className="text-center text-muted-foreground py-2 text-sm">매수 호가 없음</div>
            ) : (
              data.bids.map((bid, index) => {
                const isFlashing = flashPrices.has(bid.price);
                return (
                  <div 
                    key={`bid-${index}`} 
                    className={`relative grid grid-cols-6 gap-2 px-3 py-1.5 hover:bg-blue-50/50 transition-all cursor-pointer border-b border-blue-100/30 last:border-b-0 ${
                      isFlashing ? 'animate-pulse bg-yellow-100' : ''
                    }`}
                    onClick={() => onPriceClick?.(bid.price)}
                  >
                    {/* Bar chart background */}
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-blue-500/10"
                      style={{ width: `${calculateBarWidth(bid.quantity, maxQuantity)}%` }}
                    />
                    
                    <div className="col-span-2"></div>
                    <div className="col-span-2 text-center font-bold text-blue-600 relative z-10">
                      {formatPrice(bid.price)}
                    </div>
                    <div className="col-span-2 text-left font-semibold text-sm relative z-10">
                      {formatQuantity(bid.quantity)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Summary statistics */}
        <div className="border-t bg-muted/20 px-3 py-3">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground mb-1">총 매수</div>
              <div className="font-bold text-blue-600">
                {formatQuantity(data.bids.reduce((sum, b) => sum + b.quantity, 0))}주
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground mb-1">매수/매도 비율</div>
              <div className="font-bold">
                {(() => {
                  const totalBid = data.bids.reduce((sum, b) => sum + b.quantity, 0);
                  const totalAsk = data.asks.reduce((sum, a) => sum + a.quantity, 0);
                  const ratio = totalAsk > 0 ? (totalBid / totalAsk).toFixed(2) : '0.00';
                  return ratio;
                })()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-1">총 매도</div>
              <div className="font-bold text-red-600">
                {formatQuantity(data.asks.reduce((sum, a) => sum + a.quantity, 0))}주
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-center pt-2 border-t">
            업데이트: {new Date(data.timestamp).toLocaleTimeString('ko-KR')} • 실시간
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
