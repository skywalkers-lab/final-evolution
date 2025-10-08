import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/use-websocket';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RealTimeQuoteProps {
  guildId: string;
  symbol: string;
}

interface StockQuote {
  symbol: string;
  name: string;
  currentPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  volumeAmount: number;
  highLimit: number;
  lowLimit: number;
  high52Week: number;
  low52Week: number;
  marketCap: number;
  outstandingShares: number;
  updatedAt: string;
}

interface CircuitBreakerStatus {
  active: boolean;
  triggeredAt?: string;
  resumesAt?: string;
  remainingMinutes?: number;
}

export function RealTimeQuote({ guildId, symbol }: RealTimeQuoteProps) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [flashClass, setFlashClass] = useState('');
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreakerStatus | null>(null);

  const { data: stockData, refetch } = useQuery({
    queryKey: [`/api/web-client/guilds/${guildId}/stocks/${symbol}/quote`],
    enabled: !!symbol && !!guildId,
  });

  // 서킷브레이커 상태 조회
  const { data: cbData } = useQuery({
    queryKey: [`/api/web-client/guilds/${guildId}/stocks/${symbol}/circuit-breaker`],
    enabled: !!symbol && !!guildId,
    refetchInterval: 5000, // 5초마다 업데이트
  });

  useEffect(() => {
    if (stockData) {
      const newQuote = stockData as StockQuote;
      
      // 가격 변동 플래시 효과
      if (quote && newQuote.currentPrice !== quote.currentPrice) {
        setFlashClass(newQuote.currentPrice > quote.currentPrice ? 'flash-up' : 'flash-down');
        setTimeout(() => setFlashClass(''), 500);
      }
      
      setQuote(newQuote);
    }
  }, [stockData, quote]);

  useEffect(() => {
    if (cbData) {
      setCircuitBreaker(cbData as CircuitBreakerStatus);
    }
  }, [cbData]);

  // WebSocket으로 실시간 업데이트
  useWebSocket((event: string, data: any) => {
    if (event === 'stock_price_updated' && data.symbol === symbol) {
      const prevPrice = quote?.currentPrice || 0;
      const newPrice = data.newPrice || data.price;
      
      if (newPrice > prevPrice) {
        setFlashClass('animate-flash-red');
      } else if (newPrice < prevPrice) {
        setFlashClass('animate-flash-blue');
      }
      
      setTimeout(() => setFlashClass(''), 500);
      refetch();
    }
    
    // 서킷브레이커 이벤트 처리
    if (event === 'circuit_breaker_triggered' && data.symbol === symbol) {
      setCircuitBreaker({
        active: true,
        triggeredAt: data.triggeredAt,
        resumesAt: data.resumesAt,
        remainingMinutes: data.remainingMinutes,
      });
    }
    
    if (event === 'circuit_breaker_released' && data.symbol === symbol) {
      setCircuitBreaker({
        active: false,
      });
    }
  });

  if (!quote) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>실시간 시세</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  const isUp = quote.change > 0;
  const isDown = quote.change < 0;
  const priceColor = isUp ? 'text-red-600' : isDown ? 'text-blue-600' : 'text-gray-600';
  const bgColor = isUp ? 'bg-red-950/30' : isDown ? 'bg-blue-950/30' : 'bg-gray-950/30';
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  const formatNumber = (num: number) => num.toLocaleString('ko-KR');
  const formatPrice = (num: number) => num.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatPercent = (num: number) => {
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  return (
    <div className={`h-full p-1 transition-colors ${flashClass}`}>
      {/* HTS 스타일 종목 정보 헤더 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-white">{quote.symbol}</span>
          <span className="text-xs text-slate-300">{quote.name}</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className={`text-xs px-1 py-0.5 rounded ${
            circuitBreaker?.active ? 'bg-orange-600 text-white animate-pulse' :
            quote.currentPrice >= quote.highLimit ? 'bg-red-600 text-white' : 
            quote.currentPrice <= quote.lowLimit ? 'bg-blue-600 text-white' : 
            'bg-green-600 text-white'
          }`}>
            {circuitBreaker?.active 
              ? `서킷브레이커(${circuitBreaker.remainingMinutes || 0}분)` 
              : quote.currentPrice >= quote.highLimit ? '상한가' 
              : quote.currentPrice <= quote.lowLimit ? '하한가' 
              : '정상거래'}
          </div>
        </div>
      </div>

      {/* 가격 정보 그리드 */}
      <div className="grid grid-cols-6 gap-1 text-xs">
        {/* 현재가 */}
        <div className="col-span-2">
          <div className="text-slate-400">현재가</div>
          <div className={`font-bold text-base ${
            isUp ? 'text-red-400' : isDown ? 'text-blue-400' : 'text-white'
          }`}>
            {formatNumber(quote.currentPrice)}
          </div>
        </div>
        
        {/* 등락 */}
        <div>
          <div className="text-slate-400">등락</div>
          <div className={`font-semibold ${
            isUp ? 'text-red-400' : isDown ? 'text-blue-400' : 'text-slate-300'
          }`}>
            {isUp ? '+' : isDown ? '-' : ''}{formatNumber(Math.abs(quote.change))}
          </div>
        </div>
        
        {/* 등락률 */}
        <div>
          <div className="text-slate-400">등락률</div>
          <div className={`font-semibold ${
            isUp ? 'text-red-400' : isDown ? 'text-blue-400' : 'text-slate-300'
          }`}>
            {formatPercent(quote.changePercent)}
          </div>
        </div>
        
        {/* 거래량 */}
        <div>
          <div className="text-slate-400">거래량</div>
          <div className="text-white font-semibold">
            {Math.floor(quote.volume / 1000)}K
          </div>
        </div>
        
        {/* 시가 */}
        <div>
          <div className="text-slate-400">시가</div>
          <div className="text-slate-200 font-semibold">
            {formatNumber(quote.openPrice)}
          </div>
        </div>
      </div>

      {/* 고저가 바 */}
      <div className="mt-2 flex items-center space-x-2 text-xs">
        <span className="text-blue-400 font-semibold">{formatNumber(quote.lowPrice)}</span>
        <div className="flex-1 h-1 bg-slate-600 rounded relative">
          <div 
            className="absolute h-full bg-gradient-to-r from-blue-400 to-red-400 rounded"
            style={{ 
              width: `${Math.min(100, Math.max(10, 
                ((quote.currentPrice - quote.lowPrice) / (quote.highPrice - quote.lowPrice)) * 100
              ))}%` 
            }}
          />
        </div>
        <span className="text-red-400 font-semibold">{formatNumber(quote.highPrice)}</span>
      </div>
    </div>
  );
}
