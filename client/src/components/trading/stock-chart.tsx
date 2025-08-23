import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [timeframe, setTimeframe] = useState('1h');
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { data: candlestickData = [] } = useQuery({
    queryKey: ['/api/web-client/guilds', guildId, 'stocks', symbol, 'candlestick', timeframe],
    enabled: !!symbol && !!guildId,
    select: (data: any[]) => data || [],
  });

  const selectedStock = stocks.find(s => s.symbol === symbol);

  // WebSocket handler for real-time updates
  useWebSocket((event: string, data: any) => {
    if (event === 'stock_price_updated' && data.symbol === symbol) {
      // 실시간 가격 업데이트 시 캔들스틱 데이터와 동기화
      if (candlestickData.length > 0) {
        const lastCandle = candlestickData[candlestickData.length - 1];
        setCurrentPrice(data.newPrice);
        // 변동률을 직전 캔들의 종가 기준으로 재계산
        const prevClose = Number(lastCandle.close);
        const change = ((data.newPrice - prevClose) / prevClose) * 100;
        setPriceChange(change);
      } else {
        setCurrentPrice(data.newPrice);
        setPriceChange(data.changePercent || 0);
      }
      setLastUpdate(new Date());
      drawChart();
    } else if (event === 'stock_created' && data.guildId === guildId) {
      queryClient.invalidateQueries({ queryKey: ['/api/guilds', guildId, 'stocks'] });
    } else if (event === 'stock_deleted' && data.guildId === guildId) {
      queryClient.invalidateQueries({ queryKey: ['/api/guilds', guildId, 'stocks'] });
      if (data.symbol === symbol) {
        onSymbolChange('');
      }
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

    // Calculate price range - use consistent data source
    const prices = candlestickData.flatMap(d => [
      Number(d.high), Number(d.low), Number(d.open), Number(d.close)
    ]);
    
    // Include current price only if it's from live data and within reasonable range
    if (currentPrice > 0 && candlestickData.length > 0) {
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      if (Math.abs(currentPrice - avgPrice) / avgPrice < 0.5) { // 50% 이내 변동만 포함
        prices.push(currentPrice);
      }
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

    // Draw candlesticks with proper spacing (thinner candles)
    const candleWidth = Math.max(2, Math.min(8, (chartWidth / candlestickData.length) * 0.6));
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

    // Draw current price line if available
    if (currentPrice > 0 && currentPrice >= minPrice && currentPrice <= maxPrice) {
      const currentY = padding + ((maxPrice - currentPrice) / priceRange) * chartHeight;
      
      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, currentY);
      ctx.lineTo(width - padding, currentY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw current price label with background
      const labelText = `현재가: ₩${currentPrice.toLocaleString()}`;
      ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'left';
      const labelWidth = ctx.measureText(labelText).width;
      
      // Background for label
      ctx.fillStyle = 'rgba(243, 156, 18, 0.8)';
      ctx.fillRect(padding + 10, currentY - 20, labelWidth + 8, 16);
      
      // Label text
      ctx.fillStyle = '#000000';
      ctx.fillText(labelText, padding + 14, currentY - 8);
    }

    // Draw price labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Inter';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (priceRange * i / 5);
      const y = padding + (chartHeight * i / 5) + 4;
      ctx.fillText(`₩${Math.round(price).toLocaleString()}`, padding - 10, y);
    }

    // Draw time labels for X-axis with timeframe-specific formatting
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    
    const showEveryNth = Math.ceil(candlestickData.length / 8); // Show max 8 labels
    candlestickData.forEach((candle: any, index: number) => {
      if (index % showEveryNth === 0 || index === candlestickData.length - 1) {
        const x = padding + (index * spacing) + spacing / 2;
        const date = new Date(candle.timestamp);
        let timeLabel = '';
        
        // 시간대별 축 레이블 형식 설정 - 실제 집계된 시간 표시
        switch(timeframe) {
          case 'realtime':
            timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            break;
          case '1h':
            // 1시간 집계 - 정시 표시 (예: 14:00)
            timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit' }) + ':00';
            break;
          case '6h':
            // 6시간 집계 - 날짜와 집계 시간 표시
            timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' ' + 
                       date.toLocaleTimeString('ko-KR', { hour: '2-digit' }) + ':00';
            break;
          case '12h':
            // 12시간 집계 - 날짜와 집계 시간 표시 (00:00 또는 12:00)
            const hour12 = date.getHours() >= 12 ? '12:00' : '00:00';
            timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' ' + hour12;
            break;
          case '1d':
            // 일간 집계 - 날짜 00:00 표시
            timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' 00:00';
            break;
          case '2w':
            // 2주 집계 - 주 시작일 00:00 표시
            timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' 00:00';
            break;
          case '1m':
            // 월간 집계 - 월 시작일 00:00 표시
            timeLabel = date.toLocaleDateString('ko-KR', { year: '2-digit', month: 'short' }) + '월 1일 00:00';
            break;
          case '6m':
            // 6개월 집계 - 주 시작일 00:00 표시
            timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' 00:00';
            break;
          default:
            timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        }
        
        ctx.fillText(timeLabel, x, height - 25); // Leave more space for legend
      }
    });
    
    // Add comprehensive legend at the bottom
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Inter';
    ctx.textAlign = 'left';
    
    const latestCandle = candlestickData[candlestickData.length - 1];
    const latestHigh = Number(latestCandle?.high || 0);
    const latestLow = Number(latestCandle?.low || 0);
    const latestClose = Number(latestCandle?.close || 0);
    
    const legendText = `${symbol} | 고가: ₩${latestHigh.toLocaleString()} | 저가: ₩${latestLow.toLocaleString()} | 종가: ₩${latestClose.toLocaleString()}`;
    ctx.fillText(legendText, padding, height - 10);
    
    // Show price change if available
    if (priceChange !== 0) {
      ctx.fillStyle = priceChange > 0 ? '#e74c3c' : '#3498db';
      ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'right';
      const changeText = `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
      ctx.fillText(changeText, width - padding, height - 10);
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
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-1 bg-discord-dark rounded-lg p-2">
              {[
                { value: 'realtime', label: '실시간' },
                { value: '1h', label: '1시간' },
                { value: '6h', label: '6시간' },
                { value: '12h', label: '12시간' },
                { value: '1d', label: '1일' },
                { value: '2w', label: '2주' },
                { value: '1m', label: '1달' },
                { value: '6m', label: '6개월' }
              ].map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeframe === tf.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeframe(tf.value)}
                  className={`text-xs px-3 py-2 min-w-0 whitespace-nowrap ${
                    timeframe === tf.value 
                      ? 'bg-discord-blue text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-discord-light'
                  }`}
                  data-testid={`button-timeframe-${tf.value}`}
                >
                  {tf.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {selectedStock ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-discord-dark rounded-lg p-4">
                <h4 className="text-sm text-gray-400 mb-2">현재가</h4>
                <p className="text-2xl font-bold text-white mb-2" data-testid="text-current-price">
                  ₩{currentPrice.toLocaleString()}
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-semibold ${priceChange >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {priceChange >= 0 ? '📈 +' : '📉 '}{priceChange.toFixed(2)}%
                  </span>
                  <span className="text-xs text-gray-500" data-testid="text-last-update">
                    {formatTimeRemaining()}
                  </span>
                </div>
              </div>
              
              <div className="bg-discord-dark rounded-lg p-4">
                <h4 className="text-sm text-gray-400 mb-2">가격 범위</h4>
                <div className="space-y-1">
                  <p className="text-sm">고가: <span className="text-white font-semibold">₩{candlestickData.length > 0 
                    ? Math.max(...candlestickData.map(d => Number(d.high))).toLocaleString() 
                    : currentPrice.toLocaleString()}</span></p>
                  <p className="text-sm">저가: <span className="text-white font-semibold">₩{candlestickData.length > 0 
                    ? Math.min(...candlestickData.map(d => Number(d.low))).toLocaleString() 
                    : currentPrice.toLocaleString()}</span></p>
                </div>
              </div>
              
              <div className="bg-discord-dark rounded-lg p-4">
                <h4 className="text-sm text-gray-400 mb-2">거래 정보</h4>
                <div className="space-y-1">
                  <p className="text-sm">거래량: <span className="text-white font-semibold">{candlestickData.length > 0 
                    ? candlestickData.reduce((sum, d) => sum + Number(d.volume || 0), 0).toLocaleString()
                    : '0'}</span></p>
                  <p className="text-sm">거래대금: <span className="text-white font-semibold">₩{candlestickData.length > 0 
                    ? (candlestickData.reduce((sum, d) => sum + (Number(d.close) * Number(d.volume || 0)), 0) / 1000000000).toFixed(1)
                    : '0.0'}B</span></p>
                </div>
              </div>
            </div>
            
            {/* Chart Type Selection */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex bg-discord-dark rounded-lg p-1 gap-1">
                <Button
                  variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('candlestick')}
                  className={`px-4 py-2 ${chartType === 'candlestick' ? 'bg-discord-blue text-white' : 'text-gray-400 hover:text-white hover:bg-discord-light'}`}
                  data-testid="button-chart-candlestick"
                >
                  <i className="fas fa-chart-candlestick mr-2"></i>
                  캔들스틱
                </Button>
                <Button
                  variant={chartType === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('line')}
                  className={`px-4 py-2 ${chartType === 'line' ? 'bg-discord-blue text-white' : 'text-gray-400 hover:text-white hover:bg-discord-light'}`}
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
                          data={candlestickData && candlestickData.length > 0 ? candlestickData.map((item: any, index: number) => {
                            const date = new Date(item.timestamp);
                            let timeLabel = '';
                            
                            // 시간대별 축 레이블 형식 설정 - 실제 집계된 시간 표시
                            switch(timeframe) {
                              case 'realtime':
                                timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                                break;
                              case '1h':
                                // 1시간 집계 - 정시 표시 (예: 14:00)
                                timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit' }) + ':00';
                                break;
                              case '6h':
                                // 6시간 집계 - 날짜와 집계 시간 표시
                                timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' ' + 
                                           date.toLocaleTimeString('ko-KR', { hour: '2-digit' }) + ':00';
                                break;
                              case '12h':
                                // 12시간 집계 - 날짜와 집계 시간 표시 (00:00 또는 12:00)
                                const hour12 = date.getHours() >= 12 ? '12:00' : '00:00';
                                timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' ' + hour12;
                                break;
                              case '1d':
                                // 일간 집계 - 날짜 00:00 표시
                                timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' 00:00';
                                break;
                              case '2w':
                                // 2주 집계 - 주 시작일 00:00 표시
                                timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' 00:00';
                                break;
                              case '1m':
                                // 월간 집계 - 월 시작일 00:00 표시
                                timeLabel = date.toLocaleDateString('ko-KR', { year: '2-digit', month: 'short' }) + '월 1일 00:00';
                                break;
                              case '6m':
                                // 6개월 집계 - 주 시작일 00:00 표시
                                timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' 00:00';
                                break;
                              default:
                                timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                            }
                            
                            return {
                              time: timeLabel,
                              price: Number(item.close),
                              open: Number(item.open),
                              high: Number(item.high),
                              low: Number(item.low),
                              change: index > 0 ? Number(item.close) - Number(candlestickData[index - 1].close) : 0
                            };
                          }) : []}
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
                            domain={['dataMin - 1000', 'dataMax + 1000']}
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
                            connectNulls={true}
                            dot={{
                              fill: priceChange >= 0 ? '#ef4444' : '#3b82f6',
                              strokeWidth: 1,
                              r: 4,
                              stroke: '#ffffff'
                            }}
                            activeDot={{ 
                              r: 6, 
                              fill: priceChange >= 0 ? '#ef4444' : '#3b82f6',
                              stroke: '#ffffff',
                              strokeWidth: 2
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
