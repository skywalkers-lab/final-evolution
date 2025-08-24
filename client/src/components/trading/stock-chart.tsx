import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Bar, BarChart, ReferenceLine, ComposedChart, Tooltip } from "recharts";

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
  const [hoveredCandle, setHoveredCandle] = useState<{candle: any, x: number, y: number} | null>(null);
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 기본, 2 = 2배 확대, 0.5 = 2배 축소

  const { data: candlestickData = [] } = useQuery({
    queryKey: ['/api/web-client/guilds', guildId, 'stocks', symbol, 'candlestick', timeframe],
    enabled: !!symbol && !!guildId,
    select: (data: any[]) => data || [],
  });

  const selectedStock = stocks.find(s => s.symbol === symbol);

  // WebSocket handler for real-time updates
  useWebSocket((event: string, data: any) => {
    if (event === 'stock_price_updated' && data.symbol === symbol) {
      // 실시간 가격 업데이트 시 캔들스틱 데이터 새로 가져오기
      setCurrentPrice(data.newPrice);
      setPriceChange(data.changePercent || 0);
      setLastUpdate(new Date());
      
      // 실시간 모드에서만 즉시 업데이트
      if (isRealTimeMode) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/web-client/guilds', guildId, 'stocks', symbol, 'candlestick', timeframe] 
        });
      }
      
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

  // 실시간 모드 감지
  useEffect(() => {
    setIsRealTimeMode(timeframe === 'realtime' || timeframe === '1m' || timeframe === '3m' || timeframe === '5m');
  }, [timeframe]);

  useEffect(() => {
    drawChart();
  }, [candlestickData, symbol, zoomLevel, chartType]);

  // 실시간 애니메이션 효과를 위한 requestAnimationFrame
  useEffect(() => {
    let animationFrame: number;
    
    const animate = () => {
      if (isRealTimeMode && chartType === 'line') {
        drawChart(); // 라인 차트의 펄스 애니메이션 효과
      }
      animationFrame = requestAnimationFrame(animate);
    };
    
    if (isRealTimeMode && chartType === 'line') {
      animationFrame = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isRealTimeMode, chartType, candlestickData]);

  // 마우스 휠 줌 기능
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1; // 휠 아래로 굴리면 축소, 위로 굴리면 확대
      setZoomLevel(prev => Math.max(0.1, Math.min(5, prev + delta))); // 0.1배 ~ 5배 제한
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // 줌 조작 함수들
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(5, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.1, prev - 0.2));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  // 실시간 모드에서 주기적 업데이트
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRealTimeMode && symbol && guildId) {
      interval = setInterval(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/web-client/guilds', guildId, 'stocks', symbol, 'candlestick', timeframe] 
        });
      }, timeframe === 'realtime' ? 2000 : 5000); // 실시간: 2초, 기타: 5초
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealTimeMode, timeframe, symbol, guildId, queryClient]);

  // 마우스 이벤트 처리 - 수정된 버전
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !candlestickData || candlestickData.length === 0) {
      setHoveredCandle(null);
      return;
    }
    
    // 데이터 정렬 로직을 마우스 핸들러에도 적용
    const sortedData = candlestickData.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const displayData = isRealTimeMode 
      ? sortedData.slice(-100) // 최근 100개만 표시, 오른쪽에 최신 데이터
      : sortedData;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Canvas 스케일링 고려
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const adjustedX = mouseX * scaleX;
    const adjustedY = mouseY * scaleY;
    
    const padding = 60;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    
    // 차트 영역 안에 있는지 확인
    if (adjustedX < padding || adjustedX > canvas.width - padding || 
        adjustedY < padding || adjustedY > canvas.height - padding) {
      setHoveredCandle(null);
      return;
    }
    
    const spacing = chartWidth / displayData.length;
    const candleIndex = Math.floor((adjustedX - padding) / spacing);
    
    if (candleIndex >= 0 && candleIndex < displayData.length) {
      const candle = displayData[candleIndex];
      setHoveredCandle({ 
        candle, 
        x: mouseX,
        y: mouseY 
      });
    } else {
      setHoveredCandle(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
  };

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

    if (chartType === 'line') {
      drawLineChart();
    } else {
      drawCandlestickChart();
    }
  };

  const drawLineChart = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !candlestickData || candlestickData.length === 0) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Chart styling
    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(0, 0, width, height);

    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // 데이터 정렬 및 선택 (최신값이 오른쪽에 오도록)
    const sortedData = candlestickData.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const baseItemCount = isRealTimeMode ? 100 : sortedData.length;
    const itemsToShow = Math.max(10, Math.floor(baseItemCount / zoomLevel));
    const displayData = sortedData.slice(-itemsToShow); // 최신 데이터를 오른쪽에 표시

    // Calculate price range
    const prices = displayData.map(d => Number(d.close));
    if (currentPrice > 0 && displayData.length > 0) {
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      if (Math.abs(currentPrice - avgPrice) / avgPrice < 0.5) {
        prices.push(currentPrice);
      }
    }

    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice === 0 ? maxPrice * 0.1 : maxPrice - minPrice;
    const priceMargin = priceRange * 0.05;
    const adjustedMaxPrice = maxPrice + priceMargin;
    const adjustedMinPrice = Math.max(0, minPrice - priceMargin);
    const adjustedPriceRange = adjustedMaxPrice - adjustedMinPrice;

    // Draw grid
    drawGrid(ctx, width, height, padding, chartWidth, chartHeight, displayData, adjustedMaxPrice, adjustedMinPrice, adjustedPriceRange);

    // Draw line chart with gradient
    if (displayData.length > 1) {
      const spacing = chartWidth / (displayData.length - 1);
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');

      // Draw area under line first
      ctx.beginPath();
      ctx.moveTo(padding, height - padding);
      
      displayData.forEach((candle, index) => {
        const x = padding + (index * spacing);
        const price = Number(candle.close);
        const y = padding + ((adjustedMaxPrice - price) / adjustedPriceRange) * chartHeight;
        
        if (index === 0) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.lineTo(padding + ((displayData.length - 1) * spacing), height - padding);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw main line with animation effect
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      displayData.forEach((candle, index) => {
        const x = padding + (index * spacing);
        const price = Number(candle.close);
        const y = padding + ((adjustedMaxPrice - price) / adjustedPriceRange) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();

      // Draw data points
      displayData.forEach((candle, index) => {
        const x = padding + (index * spacing);
        const price = Number(candle.close);
        const y = padding + ((adjustedMaxPrice - price) / adjustedPriceRange) * chartHeight;
        
        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Highlight latest point with animation
        if (index === displayData.length - 1) {
          const pulseIntensity = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(x, y, 6 + pulseIntensity * 3, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(59, 130, 246, ${0.3 + pulseIntensity * 0.7})`;
          ctx.fill();
        }
      });

      // Draw current price extension if available
      if (currentPrice > 0 && isRealTimeMode && currentPrice >= adjustedMinPrice && currentPrice <= adjustedMaxPrice) {
        const lastX = padding + ((displayData.length - 1) * spacing);
        const currentY = padding + ((adjustedMaxPrice - currentPrice) / adjustedPriceRange) * chartHeight;
        const nextX = lastX + spacing;
        
        // Draw projection line
        ctx.strokeStyle = 'rgba(243, 156, 18, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(lastX, displayData.length > 0 ? 
          padding + ((adjustedMaxPrice - Number(displayData[displayData.length - 1].close)) / adjustedPriceRange) * chartHeight : 
          currentY);
        ctx.lineTo(nextX, currentY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw current price point with glow
        ctx.beginPath();
        ctx.arc(nextX, currentY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#f39c12';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Add glow effect
        const glowIntensity = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(nextX, currentY, 10 + glowIntensity * 5, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(243, 156, 18, ${0.1 + glowIntensity * 0.2})`;
        ctx.fill();
      }
    }

    // Draw labels and legend
    drawLabelsAndLegend(ctx, width, height, padding, displayData, adjustedMaxPrice, adjustedMinPrice, adjustedPriceRange, chartHeight);
  };

  // Helper function for drawing grid
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, padding: number, chartWidth: number, chartHeight: number, displayData: any[], adjustedMaxPrice: number, adjustedMinPrice: number, adjustedPriceRange: number) => {
    // Draw horizontal grid lines (가격선)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= 8; i++) {
      const y = padding + (chartHeight * i / 8);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw vertical grid lines (시간선)
    const dataLength = displayData.length;
    let gridSpacing;
    if (dataLength <= 50) {
      gridSpacing = Math.max(1, Math.ceil(dataLength / 10));
    } else if (dataLength <= 100) {
      gridSpacing = Math.max(1, Math.ceil(dataLength / 8));
    } else {
      gridSpacing = Math.max(1, Math.ceil(dataLength / 6));
    }
    
    displayData.forEach((_, index) => {
      if (index % gridSpacing === 0) {
        const x = padding + (index * (chartWidth / displayData.length));
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
      }
    });
  };

  // Helper function for drawing labels and legend
  const drawLabelsAndLegend = (ctx: CanvasRenderingContext2D, width: number, height: number, padding: number, displayData: any[], adjustedMaxPrice: number, adjustedMinPrice: number, adjustedPriceRange: number, chartHeight: number) => {
    // Draw price labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px Inter';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 8; i++) {
      const price = adjustedMaxPrice - (adjustedPriceRange * i / 8);
      const y = padding + (chartHeight * i / 8) + 4;
      
      let priceText;
      if (price >= 10000) {
        priceText = `₩${Math.round(price).toLocaleString()}`;
      } else if (price >= 1000) {
        priceText = `₩${price.toFixed(0)}`;
      } else {
        priceText = `₩${price.toFixed(1)}`;
      }
      
      ctx.fillText(priceText, padding - 5, y);
    }

    // Draw time labels for X-axis
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    
    const dataLength = displayData.length;
    let labelInterval;
    if (dataLength <= 30) {
      labelInterval = Math.max(1, Math.ceil(dataLength / 6));
    } else {
      labelInterval = Math.max(1, Math.ceil(dataLength / 4));
    }
    
    displayData.forEach((candle: any, index: number) => {
      if (index % labelInterval === 0 || index === dataLength - 1) {
        const x = padding + (index * ((width - 2 * padding) / displayData.length)) + (width - 2 * padding) / (displayData.length * 2);
        const date = new Date(candle.timestamp);
        let timeLabel = '';
        
        switch(timeframe) {
          case 'realtime':
            timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            break;
          case '1m':
          case '3m':
          case '5m':
          case '10m':
          case '15m':
          case '30m':
            timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            break;
          case '1h':
          case '2h':
          case '4h':
            timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit' }) + ':00';
            break;
          case '1d':
            timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            break;
          default:
            timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        }
        
        ctx.fillText(timeLabel, x, height - 25);
      }
    });
    
    // Add legend
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Inter';
    ctx.textAlign = 'left';
    
    const latestCandle = displayData[displayData.length - 1];
    if (latestCandle) {
      const latestClose = Number(latestCandle?.close || 0);
      const legendText = `${symbol} | 현재가: ₩${latestClose.toLocaleString()}`;
      ctx.fillText(legendText, padding, height - 10);
    }
    
    // Show price change if available
    if (priceChange !== 0) {
      ctx.fillStyle = priceChange > 0 ? '#ef4444' : '#3b82f6';
      ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'right';
      const changeText = `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
      ctx.fillText(changeText, width - padding, height - 10);
    }
  };

  const drawCandlestickChart = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !candlestickData || candlestickData.length === 0) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Chart styling
    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(0, 0, width, height);

    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // 실시간 모드에서는 최대 100개 캔들만 표시 (오른쪽으로 밀리는 효과)
    // 데이터는 시간 순서대로 정렬 (오래된 것부터 최신 것까지)
    const sortedData = candlestickData.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // 줌 레벨에 따라 표시할 데이터 개수 조정
    const baseItemCount = isRealTimeMode ? 100 : sortedData.length;
    const itemsToShow = Math.max(10, Math.floor(baseItemCount / zoomLevel)); // 최소 10개는 표시
    
    const displayData = sortedData.slice(-itemsToShow); // 최신 데이터가 오른쪽에 표시
    
    const dataToUse = displayData;

    // Calculate price range - use consistent data source
    const prices = dataToUse.flatMap(d => [
      Number(d.high), Number(d.low), Number(d.open), Number(d.close)
    ]);
    
    // Include current price only if it's from live data and within reasonable range
    if (currentPrice > 0 && dataToUse.length > 0) {
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      if (Math.abs(currentPrice - avgPrice) / avgPrice < 0.5) { // 50% 이내 변동만 포함
        prices.push(currentPrice);
      }
    }
    
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice === 0 ? maxPrice * 0.1 : maxPrice - minPrice;
    
    // 가격 범위에 여백 추가 (상하 5%씩)
    const priceMargin = priceRange * 0.05;
    const adjustedMaxPrice = maxPrice + priceMargin;
    const adjustedMinPrice = Math.max(0, minPrice - priceMargin);
    const adjustedPriceRange = adjustedMaxPrice - adjustedMinPrice;

    // Draw horizontal grid lines (가격선)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= 8; i++) { // 더 많은 그리드 라인
      const y = padding + (chartHeight * i / 8);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw vertical grid lines (시간선) - 데이터 길이에 따른 스마트한 간격 조정
    const dataLength = dataToUse.length;
    let gridSpacing;
    if (dataLength <= 50) {
      gridSpacing = Math.max(1, Math.ceil(dataLength / 10)); // 적은 데이터: 더 많은 그리드
    } else if (dataLength <= 100) {
      gridSpacing = Math.max(1, Math.ceil(dataLength / 8)); // 중간: 보통
    } else if (dataLength <= 200) {
      gridSpacing = Math.max(1, Math.ceil(dataLength / 6)); // 많은 데이터: 적은 그리드
    } else {
      gridSpacing = Math.max(1, Math.ceil(dataLength / 4)); // 매우 많은 데이터: 매우 적은 그리드
    }
    
    dataToUse.forEach((_, index) => {
      if (index % gridSpacing === 0) {
        const x = padding + (index * (chartWidth / dataToUse.length));
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
      }
    });

    // Draw candlesticks with adaptive auto-scaling for better overview
    const spacing = chartWidth / dataToUse.length;
    
    // 데이터 길이에 따른 스마트한 캔들 크기 조정 - 길어질수록 더 축소
    let candleWidth;
    if (dataLength <= 50) {
      candleWidth = Math.max(8, Math.min(16, spacing * 0.8)); // 적은 데이터: 두껍게
    } else if (dataLength <= 100) {
      candleWidth = Math.max(4, Math.min(12, spacing * 0.7)); // 중간: 보통
    } else if (dataLength <= 200) {
      candleWidth = Math.max(2, Math.min(8, spacing * 0.6)); // 많은 데이터: 얇게
    } else {
      candleWidth = Math.max(1, Math.min(4, spacing * 0.5)); // 매우 많은 데이터: 매우 얇게
    }
    
    dataToUse.forEach((candle, index) => {
      const x = padding + (index * spacing) + spacing / 2 - candleWidth / 2;
      const open = Number(candle.open);
      const close = Number(candle.close);
      const high = Number(candle.high);
      const low = Number(candle.low);

      if (priceRange === 0) return; // Skip if no price variation

      const openY = padding + ((adjustedMaxPrice - open) / adjustedPriceRange) * chartHeight;
      const closeY = padding + ((adjustedMaxPrice - close) / adjustedPriceRange) * chartHeight;
      const highY = padding + ((adjustedMaxPrice - high) / adjustedPriceRange) * chartHeight;
      const lowY = padding + ((adjustedMaxPrice - low) / adjustedPriceRange) * chartHeight;

      // Color based on price movement (Korean style: Red=Up, Blue=Down)
      const isPriceUp = close >= open;
      const upColor = '#ef4444'; // 빨간색 (상승)
      const downColor = '#3b82f6'; // 파란색 (하락)
      const color = isPriceUp ? upColor : downColor;
      
      // Draw wick (high-low line) - 더 얇게
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw body (open-close rectangle)
      const bodyHeight = Math.abs(closeY - openY);
      const bodyY = Math.min(openY, closeY);
      
      if (isPriceUp) {
        // Bullish candle - hollow with red outline (Korean style)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'; // 매우 연한 빨간색 배경
        ctx.fillRect(x, bodyY, candleWidth, Math.max(bodyHeight, 1));
        ctx.strokeStyle = upColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, bodyY, candleWidth, Math.max(bodyHeight, 1));
      } else {
        // Bearish candle - filled blue
        ctx.fillStyle = downColor;
        ctx.fillRect(x, bodyY, candleWidth, Math.max(bodyHeight, 1));
      }
    });

    // Draw current price line if available
    if (currentPrice > 0 && currentPrice >= adjustedMinPrice && currentPrice <= adjustedMaxPrice) {
      const currentY = padding + ((adjustedMaxPrice - currentPrice) / adjustedPriceRange) * chartHeight;
      
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

    // Draw price labels - 더 정확한 가격 레이블
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px Inter';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 8; i++) {
      const price = adjustedMaxPrice - (adjustedPriceRange * i / 8);
      const y = padding + (chartHeight * i / 8) + 4;
      
      // 가격 단위에 따른 포맷팅
      let priceText;
      if (price >= 10000) {
        priceText = `₩${Math.round(price).toLocaleString()}`;
      } else if (price >= 1000) {
        priceText = `₩${price.toFixed(0)}`;
      } else {
        priceText = `₩${price.toFixed(1)}`;
      }
      
      ctx.fillText(priceText, padding - 5, y);
    }

    // Draw time labels for X-axis with timeframe-specific formatting
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    
    // 데이터 길이에 따른 스마트한 레이블 표시 간격 - 전체 흐름을 보기 편하게
    let labelInterval;
    if (dataLength <= 30) {
      labelInterval = Math.max(1, Math.ceil(dataLength / 6)); // 적은 데이터: 더 많은 레이블
    } else if (dataLength <= 100) {
      labelInterval = Math.max(1, Math.ceil(dataLength / 8)); // 중간: 보통
    } else if (dataLength <= 200) {
      labelInterval = Math.max(1, Math.ceil(dataLength / 6)); // 많은 데이터: 적절한 간격
    } else {
      labelInterval = Math.max(1, Math.ceil(dataLength / 4)); // 매우 많은 데이터: 넓은 간격
    }
    
    dataToUse.forEach((candle: any, index: number) => {
      if (index % labelInterval === 0 || index === dataLength - 1) {
        const x = padding + (index * spacing) + spacing / 2;
        const date = new Date(candle.timestamp);
        let timeLabel = '';
        
        // 시간대별 축 레이블 형식 설정 - 실제 집계된 시간 표시
        switch(timeframe) {
          case 'realtime':
            timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            break;
          case '1m':
          case '3m':
          case '5m':
          case '10m':
          case '15m':
          case '30m':
            // 분 단위 집계 - 시:분 표시
            timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            break;
          case '1h':
          case '2h':
          case '4h':
            // 시간 단위 집계 - 시간 표시
            timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit' }) + ':00';
            break;
          case '1d':
            // 일간 집계 - 날짜 표시
            timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            break;
          case '7d':
            // 주간 집계 - 주 시작일 표시
            timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' (주)';
            break;
          case '30d':
            // 월간 집계 - 월 표시
            timeLabel = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
            break;
          case '365d':
            // 연간 집계 - 연도 표시
            timeLabel = date.toLocaleDateString('ko-KR', { year: 'numeric' }) + '년';
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
      ctx.fillStyle = priceChange > 0 ? '#ef4444' : '#3b82f6'; // 빨강=상승, 파랑=하락
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
            <div className="flex items-center space-x-2 mt-1 flex-wrap">
              <span className="text-sm text-gray-400">선택된 종목:</span>
              <span className="text-discord-blue font-medium">
                {selectedStock ? `${selectedStock.name} (${selectedStock.symbol})` : '선택된 종목 없음'}
              </span>
              {selectedStock && (
                <span className="text-xs whitespace-nowrap">
                  {getStatusIcon(selectedStock.status)} {getStatusText(selectedStock.status)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={symbol} onValueChange={onSymbolChange} data-testid="select-stock-symbol">
              <SelectTrigger className="w-48 bg-discord-dark border-discord-dark text-white">
                <SelectValue placeholder="종목 선택">
                  {selectedStock && (
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-discord-darker border border-discord-light flex items-center justify-center">
                        {selectedStock.logoUrl ? (
                          <img 
                            src={selectedStock.logoUrl} 
                            alt={`${selectedStock.symbol} 로고`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const nextElement = target.nextElementSibling as HTMLElement;
                              if (nextElement) nextElement.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full bg-discord-blue rounded-full flex items-center justify-center text-xs font-bold text-white ${selectedStock.logoUrl ? 'hidden' : ''}`}>
                          {selectedStock.symbol.substring(0, 2)}
                        </div>
                      </div>
                      <span>{selectedStock.symbol}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-discord-dark border-discord-dark">
                {stocks.map((stock) => (
                  <SelectItem key={stock.symbol} value={stock.symbol} className="text-white hover:bg-discord-darker">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-discord-darker border border-discord-light flex items-center justify-center">
                        {stock.logoUrl ? (
                          <img 
                            src={stock.logoUrl} 
                            alt={`${stock.symbol} 로고`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const nextElement = target.nextElementSibling as HTMLElement;
                              if (nextElement) nextElement.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full bg-discord-blue rounded-full flex items-center justify-center text-xs font-bold text-white ${stock.logoUrl ? 'hidden' : ''}`}>
                          {stock.symbol.substring(0, 2)}
                        </div>
                      </div>
                      <span>{stock.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-7 lg:grid-cols-14 gap-1 bg-discord-dark rounded-lg p-2">
              {[
                { value: 'realtime', label: '실시간' },
                { value: '1m', label: '1분' },
                { value: '3m', label: '3분' },
                { value: '5m', label: '5분' },
                { value: '10m', label: '10분' },
                { value: '15m', label: '15분' },
                { value: '30m', label: '30분' },
                { value: '1h', label: '1시간' },
                { value: '2h', label: '2시간' },
                { value: '4h', label: '4시간' },
                { value: '1d', label: '1일' },
                { value: '7d', label: '7일' },
                { value: '30d', label: '30일' },
                { value: '365d', label: '365일' }
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
            
            {/* Chart Type Selection and Zoom Controls */}
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
              
              {/* Zoom Controls */}
              <div className="flex items-center space-x-2 bg-discord-dark rounded-lg p-1">
                <span className="text-xs text-gray-400 px-2">줌:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  className="text-gray-400 hover:text-white hover:bg-discord-light px-2 py-1"
                  data-testid="button-zoom-out"
                  title="축소 (마우스 휠 아래로)"
                >
                  −
                </Button>
                <span className="text-xs text-white min-w-12 text-center">{(zoomLevel).toFixed(1)}x</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  className="text-gray-400 hover:text-white hover:bg-discord-light px-2 py-1"
                  data-testid="button-zoom-in"
                  title="확대 (마우스 휠 위로)"
                >
                  +
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomReset}
                  className="text-xs text-gray-400 hover:text-white hover:bg-discord-light px-2 py-1"
                  data-testid="button-zoom-reset"
                  title="기본 크기로 복원"
                >
                  리셋
                </Button>
              </div>
              
              <div className="text-xs text-gray-400 space-y-1">
                <div>📈 상승: <span className="text-red-500">빨간색</span> | 📉 하락: <span className="text-blue-500">파란색</span></div>
                <div>🖱️ <span className="text-yellow-400">마우스 휠로 확대/축소</span> | 🎯 <span className="text-green-400">차트 위로 마우스를 올리면 상세 정보</span></div>
              </div>
            </div>

            <div className="h-96 bg-discord-dark rounded-lg">
              {chartType === 'candlestick' ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  <canvas 
                    ref={canvasRef} 
                    width={1200} 
                    height={600} 
                    className="max-w-full max-h-full cursor-crosshair border-2 border-discord-light/20 rounded"
                    data-testid="canvas-stock-chart"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    title="마우스 휠로 확대/축소, 마우스를 올리면 상세 정보를 볼 수 있습니다"
                  />
                  
                  {/* 마우스 오버 툴팁 */}
                  {hoveredCandle && (
                    <div 
                      className="absolute bg-discord-dark border border-discord-light rounded-lg p-3 shadow-lg pointer-events-none z-10 min-w-48"
                      style={{
                        left: `${Math.min(hoveredCandle.x + 10, window.innerWidth - 250)}px`,
                        top: `${Math.max(hoveredCandle.y - 120, 10)}px`
                      }}
                    >
                      <div className="text-xs space-y-1">
                        <div className="text-white font-semibold border-b border-discord-light pb-1 mb-2">
                          {new Date(hoveredCandle.candle.timestamp).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">시가:</span>
                          <span className="text-white font-medium">₩{Number(hoveredCandle.candle.open).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">고가:</span>
                          <span className="text-red-400 font-medium">₩{Number(hoveredCandle.candle.high).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">저가:</span>
                          <span className="text-blue-400 font-medium">₩{Number(hoveredCandle.candle.low).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">종가:</span>
                          <span className={`font-medium ${
                            Number(hoveredCandle.candle.close) >= Number(hoveredCandle.candle.open) 
                              ? 'text-red-400' : 'text-blue-400'
                          }`}>
                            ₩{Number(hoveredCandle.candle.close).toLocaleString()}
                          </span>
                        </div>
                        {hoveredCandle.candle.volume && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">거래량:</span>
                            <span className="text-blue-400 font-medium">{Number(hoveredCandle.candle.volume).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-discord-light">
                          <span className="text-gray-400">변동:</span>
                          <span className={`font-medium ${
                            Number(hoveredCandle.candle.close) - Number(hoveredCandle.candle.open) >= 0
                              ? 'text-red-400' : 'text-blue-400'
                          }`}>
                            {Number(hoveredCandle.candle.close) - Number(hoveredCandle.candle.open) >= 0 ? '+' : ''}
                            ₩{(Number(hoveredCandle.candle.close) - Number(hoveredCandle.candle.open)).toLocaleString()}
                            ({((Number(hoveredCandle.candle.close) - Number(hoveredCandle.candle.open)) / Number(hoveredCandle.candle.open) * 100).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
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
                          key={`line-chart-${zoomLevel}`}
                          data={(() => {
                            if (!candlestickData || candlestickData.length === 0) return [];
                            
                            const sortedData = candlestickData.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                            const baseItemCount = isRealTimeMode ? 100 : sortedData.length;
                            const itemsToShow = Math.max(10, Math.floor(baseItemCount / zoomLevel));
                            const displayData = sortedData.slice(-itemsToShow);
                            return displayData.map((item: any, index: number, arr: any[]) => {
                            const date = new Date(item.timestamp);
                            let timeLabel = '';
                            
                            // 시간대별 축 레이블 형식 설정 - 실제 집계된 시간 표시
                            switch(timeframe) {
                              case 'realtime':
                                timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                                break;
                              case '1m':
                              case '3m':
                              case '5m':
                              case '10m':
                              case '15m':
                              case '30m':
                                // 분 단위 집계 - 시:분 표시
                                timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                                break;
                              case '1h':
                              case '2h':
                              case '4h':
                                // 시간 단위 집계 - 시간 표시
                                timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit' }) + ':00';
                                break;
                              case '1d':
                                // 일간 집계 - 날짜 표시
                                timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                                break;
                              case '7d':
                                // 주간 집계 - 주 시작일 표시
                                timeLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' (주)';
                                break;
                              case '30d':
                                // 월간 집계 - 월 표시
                                timeLabel = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
                                break;
                              case '365d':
                                // 연간 집계 - 연도 표시
                                timeLabel = date.toLocaleDateString('ko-KR', { year: 'numeric' }) + '년';
                                break;
                              default:
                                timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                            }
                            
                            return {
                              time: timeLabel,
                              timestamp: item.timestamp,
                              date: date.toLocaleDateString('ko-KR'),
                              rawTime: date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                              price: Number(item.close),
                              open: Number(item.open),
                              high: Number(item.high),
                              low: Number(item.low),
                              volume: Number(item.volume || 0),
                              change: index > 0 ? Number(item.close) - Number(arr[index - 1].close) : 0
                            };
                          });
                          })()}
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
                            interval={(() => {
                              if (!candlestickData || candlestickData.length === 0) return 'preserveStartEnd';
                              const sortedData = candlestickData.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                              const baseItemCount = isRealTimeMode ? 100 : sortedData.length;
                              const itemsToShow = Math.max(10, Math.floor(baseItemCount / zoomLevel));
                              const displayLength = Math.min(itemsToShow, sortedData.length);
                              return displayLength > 50 ? Math.ceil(displayLength / 8) : 'preserveStartEnd';
                            })()}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis 
                            stroke="#9ca3af"
                            fontSize={12}
                            tickFormatter={(value) => `₩${value.toLocaleString()}`}
                            domain={['dataMin - 1000', 'dataMax + 1000']}
                          />
                          <Tooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const priceChangeValue = data.change || 0;
                                const priceChangePercent = data.open ? ((data.price - data.open) / data.open) * 100 : 0;
                                
                                return (
                                  <div className="bg-discord-darker border border-discord-dark rounded-lg p-4 shadow-lg">
                                    <div className="text-white font-semibold mb-2">{symbol} - {data.date}</div>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">시간:</span>
                                        <span className="text-white">{data.rawTime}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">시가:</span>
                                        <span className="text-white">₩{data.open.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">고가:</span>
                                        <span className="text-red-500">₩{data.high.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">저가:</span>
                                        <span className="text-blue-500">₩{data.low.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">종가:</span>
                                        <span className="text-white font-bold">₩{data.price.toLocaleString()}</span>
                                      </div>
                                      <hr className="border-discord-dark my-2" />
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">변동:</span>
                                        <span className={priceChangeValue >= 0 ? 'text-red-500' : 'text-blue-500'}>
                                          {priceChangeValue >= 0 ? '+' : ''}₩{priceChangeValue.toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">변동률:</span>
                                        <span className={priceChangePercent >= 0 ? 'text-red-500' : 'text-blue-500'}>
                                          {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
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
