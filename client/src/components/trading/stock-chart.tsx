import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface StockChartProps {
  symbol: string;
  guildId: string;
  stocks: any[];
  onSymbolChange: (symbol: string) => void;
}

export default function StockChart({ symbol, guildId, stocks, onSymbolChange }: StockChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeframe, setTimeframe] = useState('1h');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { data: candlestickData } = useQuery({
    queryKey: ['/api/guilds', guildId, 'stocks', symbol, 'candlestick'],
    enabled: !!symbol && !!guildId,
  });

  const selectedStock = stocks.find(s => s.symbol === symbol);

  // WebSocket handler for real-time price updates
  useWebSocket((event: string, data: any) => {
    if (event === 'stock_price_updated' && data.symbol === symbol) {
      setCurrentPrice(data.newPrice);
      setPriceChange(data.changePercent);
      setLastUpdate(new Date());
      drawChart();
    }
  });

  useEffect(() => {
    if (selectedStock) {
      setCurrentPrice(Number(selectedStock.price));
    }
  }, [selectedStock]);

  useEffect(() => {
    drawChart();
  }, [candlestickData, symbol]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !candlestickData || candlestickData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Chart styling
    ctx.fillStyle = 'var(--discord-dark)';
    ctx.fillRect(0, 0, width, height);

    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Calculate price range
    const prices = candlestickData.flatMap(d => [
      Number(d.high), Number(d.low), Number(d.open), Number(d.close)
    ]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight * i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw candlesticks
    const candleWidth = Math.max(2, chartWidth / candlestickData.length - 2);
    
    candlestickData.forEach((candle, index) => {
      const x = padding + (index * chartWidth / candlestickData.length);
      const open = Number(candle.open);
      const close = Number(candle.close);
      const high = Number(candle.high);
      const low = Number(candle.low);

      const openY = padding + ((maxPrice - open) / priceRange) * chartHeight;
      const closeY = padding + ((maxPrice - close) / priceRange) * chartHeight;
      const highY = padding + ((maxPrice - high) / priceRange) * chartHeight;
      const lowY = padding + ((maxPrice - low) / priceRange) * chartHeight;

      // Color based on price movement
      const isGreen = close >= open;
      ctx.fillStyle = isGreen ? 'var(--discord-green)' : 'var(--discord-red)';
      ctx.strokeStyle = isGreen ? 'var(--discord-green)' : 'var(--discord-red)';

      // Draw wick
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw body
      const bodyHeight = Math.abs(closeY - openY);
      const bodyY = Math.min(openY, closeY);
      ctx.fillRect(x, bodyY, candleWidth, Math.max(bodyHeight, 1));
    });

    // Draw price labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Inter';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (priceRange * i / 5);
      const y = padding + (chartHeight * i / 5) + 4;
      ctx.fillText(`₩${price.toLocaleString()}`, padding - 10, y);
    }
  };

  const formatTimeRemaining = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    return diff < 60 ? `${diff}초 전` : `${Math.floor(diff / 60)}분 전`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'halted': return '🟡';
      case 'delisted': return '🔴';
      default: return '⚪';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '정상 거래';
      case 'halted': return '거래중지';
      case 'delisted': return '상장폐지';
      default: return '알 수 없음';
    }
  };

  return (
    <div className="discord-bg-darker rounded-xl border border-discord-dark">
      <div className="p-6 border-b border-discord-dark">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">실시간 주식 차트</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-400">선택된 종목:</span>
              <span className="text-discord-blue font-medium">
                {selectedStock ? `${selectedStock.name} (${selectedStock.symbol})` : '선택된 종목 없음'}
              </span>
              {selectedStock && (
                <span className="text-xs">
                  {getStatusIcon(selectedStock.status)} {getStatusText(selectedStock.status)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={symbol} onValueChange={onSymbolChange} data-testid="select-stock-symbol">
              <SelectTrigger className="w-32 bg-discord-dark border-discord-dark text-white">
                <SelectValue placeholder="종목 선택" />
              </SelectTrigger>
              <SelectContent className="bg-discord-dark border-discord-dark">
                {stocks.map((stock) => (
                  <SelectItem key={stock.symbol} value={stock.symbol} className="text-white hover:bg-discord-darker">
                    {stock.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex bg-discord-dark rounded-lg p-1">
              <Button
                variant={timeframe === '1h' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeframe('1h')}
                className={timeframe === '1h' ? 'bg-discord-blue text-white' : 'text-gray-400 hover:text-white'}
                data-testid="button-timeframe-1h"
              >
                1시간
              </Button>
              <Button
                variant={timeframe === '1d' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeframe('1d')}
                className={timeframe === '1d' ? 'bg-discord-blue text-white' : 'text-gray-400 hover:text-white'}
                data-testid="button-timeframe-1d"
              >
                1일
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {selectedStock ? (
          <>
            <div className="flex items-center space-x-6 mb-6">
              <div>
                <p className="text-2xl font-bold text-white" data-testid="text-current-price">
                  ₩{currentPrice.toLocaleString()}
                </p>
                <div className="flex items-center space-x-2">
                  <span className={priceChange >= 0 ? 'text-discord-green' : 'text-discord-red'}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                  <span className="text-xs text-gray-400" data-testid="text-last-update">
                    {formatTimeRemaining()}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                <p>고가: ₩{selectedStock.price}</p>
                <p>저가: ₩{selectedStock.price}</p>
              </div>
              <div className="text-sm text-gray-400">
                <p>거래량: 1,245,678</p>
                <p>거래대금: ₩15.6B</p>
              </div>
            </div>
            
            <div className="h-80 bg-discord-dark rounded-lg flex items-center justify-center">
              <canvas 
                ref={canvasRef} 
                width={600} 
                height={300} 
                className="max-w-full max-h-full"
                data-testid="canvas-stock-chart"
              />
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-400">
              ⚡ 5초 시뮬레이션으로 자동 업데이트됩니다.
            </div>
          </>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-400">
            차트를 보려면 종목을 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
