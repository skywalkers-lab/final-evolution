import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatKoreanCurrency } from "@/utils/formatCurrency";
import { convertToDirectImageUrl, handleImageError } from "@/utils/imageUrl";

interface SimpleStockChartProps {
  symbol: string;
  guildId: string;
  stocks: any[];
  onSymbolChange: (symbol: string) => void;
}

export default function SimpleStockChart({ symbol, guildId, stocks, onSymbolChange }: SimpleStockChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const queryClient = useQueryClient();
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [hoveredCandle, setHoveredCandle] = useState<{candle: any, x: number, y: number} | null>(null);

  const { data: candlestickData = [] } = useQuery({
    queryKey: [`/api/web-client/guilds/${guildId}/stocks/${symbol}/candlestick/realtime`],
    enabled: !!symbol && !!guildId,
    select: (data: any[]) => data || [],
  });

  const selectedStock = stocks && Array.isArray(stocks) ? stocks.find(s => s?.symbol === symbol) : null;

  // WebSocket handler for real-time updates
  useWebSocket((event: string, data: any) => {
    try {
      if (!event || !data) return;
      
      if (event === 'stock_price_updated' && data.symbol === symbol) {
        if (typeof data.newPrice === 'number') {
          setCurrentPrice(data.newPrice);
        }
        setPriceChange(data.changePercent || 0);
        
        queryClient.invalidateQueries({ 
          queryKey: [`/api/web-client/guilds/${guildId}/stocks/${symbol}/candlestick/realtime`] 
        });
        
        try {
          drawChart();
        } catch (chartError) {
          console.error('Error drawing chart:', chartError);
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  useEffect(() => {
    if (selectedStock) {
      setCurrentPrice(Number(selectedStock.price));
    }
  }, [selectedStock]);

  useEffect(() => {
    drawChart();
  }, [candlestickData, symbol, currentPrice]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !candlestickData || candlestickData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.fillStyle = '#1a1d29';
    ctx.fillRect(0, 0, width, height);

    // Sort and prepare data
    const sortedData = candlestickData.slice().sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const displayData = sortedData.slice(-50);
    
    if (displayData.length === 0) return;

    // Calculate price range
    const prices = displayData.flatMap(d => [Number(d.high), Number(d.low)]);
    if (currentPrice > 0) prices.push(currentPrice);
    
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice || maxPrice * 0.1;

    // Helper functions
    const priceToY = (price: number) => {
      return padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    };

    const spacing = chartWidth / displayData.length;

    // Draw grid
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      const price = maxPrice - (priceRange / 5) * i;
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formatKoreanCurrency(price), padding - 10, y + 4);
    }

    // Draw candlesticks
    displayData.forEach((candle, index) => {
      const x = padding + index * spacing + spacing / 2;
      const open = Number(candle.open);
      const close = Number(candle.close);
      const high = Number(candle.high);
      const low = Number(candle.low);

      const isUp = close >= open;
      ctx.strokeStyle = isUp ? '#ef4444' : '#3b82f6';
      ctx.fillStyle = isUp ? '#ef4444' : '#3b82f6';

      // Draw wick
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, priceToY(high));
      ctx.lineTo(x, priceToY(low));
      ctx.stroke();

      // Draw body
      const bodyTop = priceToY(Math.max(open, close));
      const bodyBottom = priceToY(Math.min(open, close));
      const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
      const candleWidth = Math.max(spacing * 0.6, 2);

      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // Draw current price line
    if (currentPrice > 0) {
      const y = priceToY(currentPrice);
      ctx.strokeStyle = priceChange >= 0 ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle = priceChange >= 0 ? '#ef4444' : '#3b82f6';
      ctx.fillRect(width - padding + 5, y - 12, 100, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatKoreanCurrency(currentPrice), width - padding + 10, y + 4);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !candlestickData || candlestickData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const y = ((e.clientY - rect.top) * canvas.height) / rect.height;

    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    
    const sortedData = candlestickData.slice().sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const displayData = sortedData.slice(-50);
    const spacing = chartWidth / displayData.length;

    const adjustedX = x - padding;
    if (adjustedX < 0 || adjustedX > chartWidth) {
      setHoveredCandle(null);
      return;
    }

    const candleIndex = Math.floor(adjustedX / spacing);
    if (candleIndex >= 0 && candleIndex < displayData.length) {
      setHoveredCandle({
        candle: displayData[candleIndex],
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    } else {
      setHoveredCandle(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
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
      case 'active': return '거래중';
      case 'halted': return '거래정지';
      case 'delisted': return '상장폐지';
      default: return '알 수 없음';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 간단한 헤더 */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <Select value={symbol} onValueChange={onSymbolChange}>
          <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white h-8">
            <SelectValue placeholder="종목 선택">
              {selectedStock && (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 border border-slate-600 flex items-center justify-center">
                    {selectedStock.logoUrl ? (
                      <img 
                        src={convertToDirectImageUrl(selectedStock.logoUrl) || selectedStock.logoUrl} 
                        alt={`${selectedStock.symbol} 로고`}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white ${selectedStock.logoUrl ? 'hidden' : ''}`}>
                      {selectedStock.symbol.substring(0, 2)}
                    </div>
                  </div>
                  <span className="text-sm">{selectedStock.symbol}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {stocks.map((stock) => (
              <SelectItem key={stock.symbol} value={stock.symbol} className="text-white hover:bg-slate-700">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 border border-slate-600 flex items-center justify-center">
                    {stock.logoUrl ? (
                      <img 
                        src={convertToDirectImageUrl(stock.logoUrl) || stock.logoUrl} 
                        alt={`${stock.symbol} 로고`}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white ${stock.logoUrl ? 'hidden' : ''}`}>
                      {stock.symbol.substring(0, 2)}
                    </div>
                  </div>
                  <span className="text-sm">{stock.symbol}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedStock && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">
              {getStatusIcon(selectedStock.status)} {getStatusText(selectedStock.status)}
            </span>
            <div className="text-right">
              <div className="text-sm font-bold text-white">
                ₩{currentPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-xs font-semibold ${priceChange >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 차트 영역 */}
      <div className="flex-1 min-h-0">
        {selectedStock ? (
          <div className="w-full h-full flex items-center justify-center relative bg-slate-900 rounded border border-slate-700">
            <canvas 
              ref={canvasRef} 
              width={1400} 
              height={600} 
              className="max-w-full max-h-full cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
            
            {/* 마우스 오버 툴팁 */}
            {hoveredCandle && (
              <div 
                className="absolute bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg pointer-events-none z-10 min-w-48"
                style={{
                  left: `${Math.min(hoveredCandle.x + 10, window.innerWidth - 250)}px`,
                  top: `${Math.max(hoveredCandle.y - 120, 10)}px`
                }}
              >
                <div className="text-xs space-y-1">
                  <div className="text-white font-semibold border-b border-slate-600 pb-1 mb-2">
                    {new Date(hoveredCandle.candle.timestamp).toLocaleString('ko-KR', {
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">시가:</span>
                    <span className="text-white font-medium">₩{Number(hoveredCandle.candle.open).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">고가:</span>
                    <span className="text-red-400 font-medium">₩{Number(hoveredCandle.candle.high).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">저가:</span>
                    <span className="text-blue-400 font-medium">₩{Number(hoveredCandle.candle.low).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">종가:</span>
                    <span className={`font-medium ${
                      Number(hoveredCandle.candle.close) >= Number(hoveredCandle.candle.open) 
                        ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      ₩{Number(hoveredCandle.candle.close).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 bg-slate-900 rounded border border-slate-700">
            종목을 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
