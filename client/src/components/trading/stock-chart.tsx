import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Bar, BarChart, ReferenceLine } from "recharts";

interface StockChartProps {
  symbol: string;
  guildId: string;
  stocks: any[];
  onSymbolChange: (symbol: string) => void;
}

export default function StockChart({ symbol, guildId, stocks, onSymbolChange }: StockChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeframe, setTimeframe] = useState('1h');
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
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
    if (!canvas || !candlestickData || candlestickData.length === 0) {
      // Draw empty chart message
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { width, height } = canvas;
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = '#2c2f33';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = '#ffffff';
          ctx.font = '14px Inter';
          ctx.textAlign = 'center';
          ctx.fillText('차트 데이터가 없습니다', width / 2, height / 2);
        }
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Chart styling
    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(0, 0, width, height);

    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Calculate price range including current price
    const prices = candlestickData.flatMap(d => [
      Number(d.high), Number(d.low), Number(d.open), Number(d.close)
    ]);
    if (currentPrice > 0) {
      prices.push(currentPrice);
    }
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice === 0 ? maxPrice * 0.1 : maxPrice - minPrice;

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

    // Draw candlesticks with proper spacing
    const candleWidth = Math.max(6, (chartWidth / candlestickData.length) * 0.8);
    const spacing = chartWidth / candlestickData.length;
    
    candlestickData.forEach((candle, index) => {
      const x = padding + (index * spacing) + spacing / 2 - candleWidth / 2;
      const open = Number(candle.open);
      const close = Number(candle.close);
      const high = Number(candle.high);
      const low = Number(candle.low);

      if (priceRange === 0) return; // Skip if no price variation

      const openY = padding + ((maxPrice - open) / priceRange) * chartHeight;
      const closeY = padding + ((maxPrice - close) / priceRange) * chartHeight;
      const highY = padding + ((maxPrice - high) / priceRange) * chartHeight;
      const lowY = padding + ((maxPrice - low) / priceRange) * chartHeight;

      // Color based on price movement (Korean style: Red=Up, Blue=Down)
      const isPriceUp = close >= open;
      const color = isPriceUp ? '#ef4444' : '#3b82f6'; // Red for up, Blue for down
      
      // Draw wick (high-low line)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw body (open-close rectangle)
      const bodyHeight = Math.abs(closeY - openY);
      const bodyY = Math.min(openY, closeY);
      
      if (isPriceUp) {
        // Bullish candle - hollow (outline only)
        ctx.fillStyle = '#2c2f33'; // Fill with background color
        ctx.fillRect(x, bodyY, candleWidth, Math.max(bodyHeight, 2));
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, bodyY, candleWidth, Math.max(bodyHeight, 2));
      } else {
        // Bearish candle - filled
        ctx.fillStyle = color;
        ctx.fillRect(x, bodyY, candleWidth, Math.max(bodyHeight, 2));
      }
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
                  <span className={priceChange >= 0 ? 'text-red-500' : 'text-blue-500'}>
                    {priceChange >= 0 ? '📈 +' : '📉 '}{priceChange.toFixed(2)}%
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
            
            {/* Chart Type Selection */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex bg-discord-dark rounded-lg p-1">
                <Button
                  variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('candlestick')}
                  className={chartType === 'candlestick' ? 'bg-discord-blue text-white' : 'text-gray-400 hover:text-white'}
                  data-testid="button-chart-candlestick"
                >
                  <i className="fas fa-chart-candlestick mr-2"></i>
                  캔들스틱
                </Button>
                <Button
                  variant={chartType === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('line')}
                  className={chartType === 'line' ? 'bg-discord-blue text-white' : 'text-gray-400 hover:text-white'}
                  data-testid="button-chart-line"
                >
                  <i className="fas fa-chart-line mr-2"></i>
                  꺾은선
                </Button>
              </div>
              <div className="text-xs text-gray-500">
                📈 상승: <span className="text-red-500">빨간색</span> | 📉 하락: <span className="text-blue-500">파란색</span>
              </div>
            </div>

            <div className="h-80 bg-discord-dark rounded-lg">
              {chartType === 'candlestick' ? (
                <div className="w-full h-full flex items-center justify-center">
                  <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={320} 
                    className="max-w-full max-h-full"
                    data-testid="canvas-stock-chart"
                  />
                </div>
              ) : (
                <div className="w-full h-full p-4">
                  {candlestickData && candlestickData.length > 0 ? (
                    <ChartContainer
                      config={{
                        price: {
                          label: "가격",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={candlestickData.map((item: any, index: number) => ({
                            time: `${index + 1}`,
                            price: Number(item.close),
                            change: index > 0 ? Number(item.close) - Number(candlestickData[index - 1].close) : 0
                          }))}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="time" 
                            stroke="#9ca3af"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="#9ca3af"
                            fontSize={12}
                            tickFormatter={(value) => `₩${value.toLocaleString()}`}
                          />
                          <ChartTooltip 
                            content={<ChartTooltipContent 
                              formatter={(value, name) => [
                                `₩${Number(value).toLocaleString()}`,
                                "주가"
                              ]}
                            />}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke={priceChange >= 0 ? '#ef4444' : '#3b82f6'}
                            strokeWidth={2}
                            dot={{
                              fill: priceChange >= 0 ? '#ef4444' : '#3b82f6',
                              strokeWidth: 0,
                              r: 3
                            }}
                            activeDot={{ 
                              r: 5, 
                              fill: priceChange >= 0 ? '#ef4444' : '#3b82f6'
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <i className="fas fa-chart-line text-4xl mb-4"></i>
                        <p>차트 데이터를 불러오는 중...</p>
                        <p className="text-sm mt-2">주식 거래가 시작되면 실시간 데이터가 표시됩니다</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-discord-darker rounded-lg border border-yellow-600/30">
                <i className="fas fa-bolt text-yellow-500"></i>
                <span className="text-sm text-yellow-300 font-medium">실시간 시뮬레이션 - 5초마다 자동 업데이트</span>
                <i className="fas fa-university text-yellow-500"></i>
              </div>
              <p className="text-xs text-gray-500 mt-2">🏦 한국은행 종합서비스센터 가상경제시스템</p>
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
