import { IStorage } from '../storage';
import { WebSocketManager } from './websocket-manager';

export class TradingEngine {
  private storage: IStorage;
  private wsManager: WebSocketManager;
  private priceSimulationInterval: NodeJS.Timeout | null = null;

  constructor(storage: IStorage, wsManager: WebSocketManager) {
    this.storage = storage;
    this.wsManager = wsManager;
  }

  start() {
    // Start realistic price simulation every 10 seconds for more stable simulation
    this.priceSimulationInterval = setInterval(() => {
      this.simulatePriceMovements();
    }, 10000); // 10초마다 업데이트 (안정적인 시뮬레이션)

    console.log('Trading engine started');
  }

  stop() {
    if (this.priceSimulationInterval) {
      clearInterval(this.priceSimulationInterval);
      this.priceSimulationInterval = null;
    }
  }

  async executeTrade(guildId: string, userId: string, symbol: string, type: 'buy' | 'sell', shares: number, price: number) {
    const stock = await this.storage.getStockBySymbol(guildId, symbol);
    if (!stock) {
      throw new Error('종목을 찾을 수 없습니다');
    }

    if (stock.status !== 'active') {
      throw new Error(`${stock.status === 'halted' ? '거래가 중지된' : '상장폐지된'} 종목입니다`);
    }

    const account = await this.storage.getAccountByUser(guildId, userId);
    if (!account) {
      throw new Error('계좌를 찾을 수 없습니다');
    }

    if (account.frozen) {
      throw new Error('계좌가 동결되어 거래할 수 없습니다');
    }

    if (account.tradingSuspended) {
      throw new Error('관리자에 의해 거래가 중지된 계좌입니다');
    }

    const totalAmount = price * shares;

    if (type === 'buy') {
      // Check balance for buy orders
      const currentBalance = Number(account.balance);
      if (currentBalance - totalAmount < 1) {
        throw new Error('잔액이 부족합니다 (거래 후 최소 1원이 남아있어야 합니다)');
      }

      // Execute buy order
      const result = await this.storage.executeTrade(guildId, userId, symbol, type, shares, price);
      
      // Update candlestick data
      await this.updateCandlestickData(guildId, symbol, price, shares);
      
      // Apply minimal market impact only for large trades
      if (shares > 1000) { // Only for trades over 1000 shares
        await this.applyMarketImpact(guildId, symbol, type, shares, price);
      }
      
      // Broadcast to websocket clients
      this.wsManager.broadcast('trade_executed', result);
      
      return result;
    } else {
      // Check holdings for sell orders
      const holding = await this.storage.getHolding(guildId, userId, symbol);
      if (!holding || holding.shares < shares) {
        throw new Error('보유 수량이 부족합니다');
      }

      // Execute sell order
      const result = await this.storage.executeTrade(guildId, userId, symbol, type, shares, price);
      
      // Update candlestick data
      await this.updateCandlestickData(guildId, symbol, price, shares);
      
      // Apply minimal market impact only for large trades
      if (shares > 1000) { // Only for trades over 1000 shares
        await this.applyMarketImpact(guildId, symbol, type, shares, price);
      }
      
      // Broadcast to websocket clients
      this.wsManager.broadcast('trade_executed', result);
      
      return result;
    }
  }

  async calculatePortfolioValue(guildId: string, userId: string): Promise<number> {
    const holdings = await this.storage.getHoldingsByUser(guildId, userId);
    const account = await this.storage.getAccountByUser(guildId, userId);
    
    let totalValue = Number(account?.balance || 0);
    
    for (const holding of holdings) {
      const stock = await this.storage.getStockBySymbol(guildId, holding.symbol);
      if (stock && stock.status !== 'delisted') {
        totalValue += Number(stock.price) * holding.shares;
      }
    }
    
    return totalValue;
  }

  private async simulatePriceMovements() {
    try {
      // 모든 활성 주식에 대해 가격 시뮬레이션
      const activeStocks = await this.storage.getAllActiveStocks();
      console.log(`📊 Simulating prices for ${activeStocks.length} active stocks`);
      
      for (const stock of activeStocks) {
        if (stock.status === 'active') {
          await this.simulateStockPrice(stock);
        }
      }
    } catch (error) {
      console.error('Error in price simulation:', error);
    }
  }

  // 주식별 트렌드 기억을 위한 맵 (뉴스 기반 관성 포함)
  private stockTrends: Map<string, { 
    direction: number; 
    strength: number; 
    lastChange: number;
    newsBasedMomentum?: {
      direction: number; // 뉴스에 의한 관성 방향 (-1 ~ 1)
      intensity: number; // 관성 강도 (0 ~ 1)
      startTime: number; // 관성 시작 시간 (타임스탬프)
      duration: number;  // 관성 지속 시간 (밀리초, 기본 3분)
    }
  }> = new Map();

  private async simulateStockPrice(stock: any) {
    try {
      const currentPrice = Number(stock.price);
      const stockKey = `${stock.guildId}:${stock.symbol}`;
      
      // 모든 주식에 적절한 변동성 적용 (더 현실적으로)
      const isBitcoin = stock.symbol === 'BTC';
      const baseVolatility = isBitcoin ? 2.5 : 1.2; // BTC: 2.5%, 일반주식: 1.2%로 증가
      const volatility = Number(stock.volatility || baseVolatility);
      
      // 1. 뉴스 기반 관성 계산 (뉴스에 의해서만 관성 생성)
      let trend = this.stockTrends.get(stockKey) || { direction: 0, strength: 0, lastChange: 0 };
      let newsMomentum = 0;
      
      // 뉴스 기반 관성이 있는지 확인하고 3분 제한 체크
      if (trend.newsBasedMomentum) {
        const now = Date.now();
        const elapsed = now - trend.newsBasedMomentum.startTime;
        
        if (elapsed < trend.newsBasedMomentum.duration) {
          // 관성이 아직 유효한 경우
          const remainingTime = trend.newsBasedMomentum.duration - elapsed;
          const timeDecay = remainingTime / trend.newsBasedMomentum.duration; // 시간에 따른 감소
          
          // 관성 방향에 요동 추가 (±30% 랜덤 변동으로 자연스러운 움직임)
          const fluctuation = (Math.random() - 0.5) * 0.6; // -0.3 ~ +0.3
          const momentumDirection = trend.newsBasedMomentum.direction + fluctuation;
          
          newsMomentum = momentumDirection * trend.newsBasedMomentum.intensity * timeDecay * (isBitcoin ? 0.8 : 0.6);
          
          console.log(`📈 ${stock.symbol} 뉴스 관성: ${(newsMomentum * 100).toFixed(2)}% (남은시간: ${Math.round(remainingTime / 1000)}초)`);
        } else {
          // 관성 시간 만료 - 제거
          delete trend.newsBasedMomentum;
          this.stockTrends.set(stockKey, trend);
          console.log(`⏰ ${stock.symbol} 뉴스 관성 만료`);
        }
      }
      
      // 기존 트렌드 관성을 거의 없애고 뉴스 중심으로 변경
      const basicTrendMomentum = trend.newsBasedMomentum ? 0 : trend.direction * trend.strength * 0.01; // 모든 주식 동일하게 매우 약함
      
      // 2. 기본 무작위 변동 - 더 강한 랜덤성으로 트렌드 억제
      const gaussian = () => {
        // Box-Muller 변환으로 정규분포 생성
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); // 0 방지
        while(v === 0) v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        return z * (isBitcoin ? 0.8 : 0.3); // 비트코인은 더 큰 랜덤성
      };
      
      const marketHour = new Date().getHours();
      const isMarketOpen = marketHour >= 9 && marketHour <= 15; // 9시-15시 활발
      const marketMultiplier = isMarketOpen ? 1.2 : 0.6; // 시장 시간에 따른 변동성 조절
      
      // 모든 주식에 강한 랜덤성 적용 (실제 주식처럼)
      let baseChangePercent = gaussian() * (volatility / 100) * marketMultiplier;
      
      // 모든 주식에 추가 랜덤 요소와 방향 변경 확률 적용
      if (Math.random() < 0.4) {
        // 40% 확률로 방향 강제 변경 (트렌드 억제)
        baseChangePercent *= -1;
      }
      
      // 추가 랜덤 노이즈 (주식별로 다르게)
      const randomNoise = (Math.random() - 0.5) * (isBitcoin ? 0.015 : 0.008); // BTC: ±1.5%, 일반: ±0.8%
      baseChangePercent += randomNoise;
      
      // 3. 매수/매도량에 따른 영향 계산 (더 강한 영향력으로 조정)
      const tradeImpactLimit = isBitcoin ? 0.02 : 0.008; // BTC: ±2%, 일반: ±0.8%로 증가
      const tradeImpact = Math.max(-tradeImpactLimit, Math.min(tradeImpactLimit, await this.calculateTradeImpact(stock.guildId, stock.symbol)));
      
      // 4. 뉴스 영향 계산 (더 강한 뉴스 영향력)
      const newsImpactLimit = isBitcoin ? 0.025 : 0.012; // BTC: ±2.5%, 일반: ±1.2%로 증가
      const newsImpact = Math.max(-newsImpactLimit, Math.min(newsImpactLimit, await this.calculateNewsImpact(stock.guildId, stock.symbol)));
      
      // 5. 모든 주식에 시장 급변 요소 추가 (실제 주식처럼)
      let marketShock = 0;
      if (Math.random() < 0.1) { // 10% 확률로 시장 급변 발동
        marketShock = (Math.random() - 0.5) * (isBitcoin ? 0.05 : 0.03); // BTC: ±2.5%, 일반: ±1.5%
      }
      
      // 6. 총 변동률 계산 (뉴스관성 + 기본트렌드 + 기본변동 + 거래량 + 뉴스즉시 + 시장급변)
      const totalChangePercent = newsMomentum + basicTrendMomentum + baseChangePercent + tradeImpact + newsImpact + marketShock;
      
      // 디버깅 정보 (필요시에만 활성화)
      if (Math.random() < 0.05 && isBitcoin) { // 5% 확률로만 로그 출력
        console.log(`🔍 ${stock.symbol} 계산:
          뉴스관성: ${(newsMomentum * 100).toFixed(2)}%
          기본변동: ${(baseChangePercent * 100).toFixed(2)}%
          거래영향: ${(tradeImpact * 100).toFixed(2)}%
          뉴스즉시: ${(newsImpact * 100).toFixed(2)}%
          시장급변: ${(marketShock * 100).toFixed(2)}%
          총변동: ${(totalChangePercent * 100).toFixed(2)}%`);
      }
      
      // 7. 안전 범위 제한 (더 넓은 범위로 조정)
      const maxDailyChange = isBitcoin ? 0.08 : 0.05; // BTC: ±8%, 일반: ±5%로 증가
      const safeChangePercent = Math.max(-maxDailyChange, Math.min(maxDailyChange, totalChangePercent));
      
      // 8. 새 가격 계산 - 더 현실적인 변동 범위
      const targetPrice = currentPrice * (1 + safeChangePercent);
      
      if (isBitcoin) {
        // 비트코인: 더 큰 변동성, 더 정밀한 가격 (상승/하락 균형 맞춤)
        const clampedChange = Math.max(-0.08, Math.min(0.08, safeChangePercent)); // ±8% 제한
        var newPrice = Math.max(1, Math.round(currentPrice * (1 + clampedChange) * 100) / 100); // 소수점 2자리
      } else {
        // 일반 주식: 더 세밀한 변동, 0.01%~3% 범위
        const maxChange = Math.min(0.03, volatility / 100); // 최대 3% 또는 설정된 변동성
        const clampedChange = Math.max(-maxChange, Math.min(maxChange, safeChangePercent));
        var newPrice = Math.max(currentPrice * 0.001, Math.round(currentPrice * (1 + clampedChange)));
      }
      
      // 8. 트렌드 업데이트 (기본 관성 시스템 - 뉴스 관성이 없을 때만)
      const actualChange = (newPrice - currentPrice) / currentPrice;
      if (Math.abs(actualChange) > 0.001 && !trend.newsBasedMomentum) { // 뉴스 관성이 없을 때만 기본 트렌드 업데이트
        // 트렌드 방향 업데이트 (상승: 1, 하락: -1)
        const newDirection = actualChange > 0 ? 1 : -1;
        
        // 모든 주식에 트렌드 억제 적용 (균형잡힌 움직임을 위해)
        if (Math.random() < 0.6) {
          // 60% 확률로 트렌드 강도를 감소시켜 관성 억제
          trend.strength = Math.max(0.0, trend.strength - 0.15);
        } else {
          // 같은 방향이면 강도 증가, 다른 방향이면 강도 감소 (매우 약하게)
          if (trend.direction === newDirection) {
            trend.strength = Math.min(0.2, trend.strength + 0.02); // 최대 0.2로 축소
          } else {
            trend.strength = Math.max(0.0, trend.strength - 0.5); // 더 빠르게 감소
            if (trend.strength === 0) {
              trend.direction = newDirection; // 방향 전환
              trend.strength = 0.02; // 시작 강도도 축소
            }
          }
        }
        
        trend.lastChange = actualChange;
        this.stockTrends.set(stockKey, trend);
      }
      
      // 9. 거래량 계산 (변동률에 비례)
      const baseVolume = Math.floor(Math.random() * 500) + 50; // 50~550주로 축소
      const volumeMultiplier = Math.abs(safeChangePercent) * 10 + 1;
      const volume = Math.round(baseVolume * volumeMultiplier);
      
      // 10. 가격이 실제로 변경된 경우만 업데이트
      if (newPrice !== currentPrice) {
        await this.storage.updateStockPrice(stock.guildId, stock.symbol, newPrice);
        await this.updateCandlestickData(stock.guildId, stock.symbol, newPrice, volume);
        await this.checkAndExecuteLimitOrders(stock.guildId, stock.symbol, newPrice);
        
        // WebSocket으로 실시간 가격 변동 알림
        this.wsManager.broadcast('stock_price_updated', {
          guildId: stock.guildId,
          symbol: stock.symbol,
          oldPrice: currentPrice,
          newPrice,
          changePercent: actualChange * 100,
          volume,
          trend: trend.direction > 0 ? '📈' : '📉'
        });
        
        const trendEmoji = trend.direction > 0 ? '📈' : '📉';
        console.log(`💹 ${stock.symbol}: ${currentPrice.toLocaleString()}원 → ${newPrice.toLocaleString()}원 (${(actualChange * 100).toFixed(3)}%) ${trendEmoji}`);
      }
    } catch (error) {
      console.error(`Error simulating price for ${stock.symbol}:`, error);
    }
  }

  // 뉴스 분석에서 호출할 관성 설정 메서드
  public setNewsBasedMomentum(guildId: string, symbol: string, direction: number, intensity: number, durationMinutes: number = 3) {
    const stockKey = `${guildId}:${symbol}`;
    let trend = this.stockTrends.get(stockKey) || { direction: 0, strength: 0, lastChange: 0 };
    
    // 뉴스 기반 관성 설정
    trend.newsBasedMomentum = {
      direction: Math.max(-1, Math.min(1, direction)), // -1 ~ 1 범위로 제한
      intensity: Math.max(0, Math.min(1, intensity)),  // 0 ~ 1 범위로 제한
      startTime: Date.now(),
      duration: durationMinutes * 60 * 1000 // 분을 밀리초로 변환
    };
    
    this.stockTrends.set(stockKey, trend);
    console.log(`📰 ${symbol} 뉴스 관성 설정: 방향=${direction > 0 ? '상승' : '하락'}, 강도=${(intensity * 100).toFixed(1)}%, 지속=${durationMinutes}분`);
  }

  // 매수/매도 압력에 따른 가격 영향 계산
  private async calculateTradeImpact(guildId: string, symbol: string): Promise<number> {
    try {
      // 최근 1분간의 거래량 분석 (매수 vs 매도)
      const recentTrades = await this.storage.getRecentTradesBySymbol(guildId, symbol, 1); // 1분간
      
      let buyVolume = 0;
      let sellVolume = 0;
      
      for (const trade of recentTrades) {
        if (trade.type === 'buy') {
          buyVolume += trade.shares;
        } else if (trade.type === 'sell') {
          sellVolume += trade.shares;
        }
      }
      
      const totalVolume = buyVolume + sellVolume;
      if (totalVolume === 0) return 0;
      
      // 매수 압력이 강하면 상승, 매도 압력이 강하면 하락
      const buyPressure = buyVolume / totalVolume;
      const sellPressure = sellVolume / totalVolume;
      const pressureDiff = buyPressure - sellPressure;
      
      // 최대 ±0.1% 영향 (거래량에 따라)
      const maxImpact = Math.min(totalVolume / 10000, 0.001); // 거래량이 많을수록 영향 증가
      return pressureDiff * maxImpact;
      
    } catch (error) {
      console.error('Error calculating trade impact:', error);
      return 0;
    }
  }

  // 뉴스/이벤트에 따른 가격 영향 계산 (향후 확장)
  private async calculateNewsImpact(guildId: string, symbol: string): Promise<number> {
    try {
      // 향후 뉴스 시스템과 연동 가능
      // 현재는 간단한 랜덤 이벤트로 구현
      const randomEvent = Math.random();
      
      // 0.1% 확률로 긍정적 뉴스 (+0.2%~+0.5%)
      if (randomEvent < 0.001) {
        console.log(`📰 ${symbol}: 긍정적 뉴스 영향`);
        return (Math.random() * 0.003 + 0.002); // +0.2%~+0.5%
      }
      
      // 0.1% 확률로 부정적 뉴스 (-0.2%~-0.5%)
      if (randomEvent > 0.999) {
        console.log(`📰 ${symbol}: 부정적 뉴스 영향`);
        return -(Math.random() * 0.003 + 0.002); // -0.2%~-0.5%
      }
      
      return 0; // 대부분의 경우 뉴스 영향 없음
      
    } catch (error) {
      console.error('Error calculating news impact:', error);
      return 0;
    }
  }

  private async updateCandlestickData(guildId: string, symbol: string, price: number, volume: number) {
    try {
      const now = new Date();
      
      // Update multiple timeframes for real-time progression
      const timeframes = [
        { tf: 'realtime', interval: 1 }, // Every second for real-time
        { tf: '1m', interval: 1 }, // Every minute
        { tf: '3m', interval: 3 }, // Every 3 minutes
        { tf: '5m', interval: 5 }, // Every 5 minutes
        { tf: '10m', interval: 10 }, // Every 10 minutes
        { tf: '15m', interval: 15 }, // Every 15 minutes
        { tf: '30m', interval: 30 }, // Every 30 minutes
        { tf: '1h', interval: 60 }, // Every hour
        { tf: '2h', interval: 120 }, // Every 2 hours
        { tf: '4h', interval: 240 }, // Every 4 hours
        { tf: '1d', interval: 1440 }, // Every day
        { tf: '7d', interval: 10080 }, // Every week (7 days)
        { tf: '30d', interval: 43200 }, // Every month (30 days)
        { tf: '365d', interval: 525600 }, // Every year (365 days)
      ];
      
      for (const { tf, interval } of timeframes) {
        const timestamp = this.getTimeframeTimestamp(now, tf);
        
        // Get or create candlestick for this timeframe
        let candlestick = await this.storage.getCandlestick(guildId, symbol, tf, timestamp);
        
        if (!candlestick) {
          // Create new candlestick
          await this.storage.createCandlestick({
            guildId,
            symbol,
            timeframe: tf,
            timestamp: timestamp,
            open: price.toString(),
            high: price.toString(),
            low: price.toString(),
            close: price.toString(),
            volume
          });
        } else {
          // Update existing candlestick with more conservative high/low updates
          const currentHigh = Number(candlestick.high);
          const currentLow = Number(candlestick.low);
          const openPrice = Number(candlestick.open);
          
          // EXTREME SAFETY: Only allow minimal high/low updates (0.01% threshold)
          const significantChange = Math.abs(price - openPrice) / openPrice;
          let newHigh = currentHigh;
          let newLow = currentLow;
          
          // 극도로 제한적인 High/Low 업데이트 (0.01% 이상 변동시만)
          if (significantChange > 0.0001) { 
            // 추가 안전장치: High/Low도 기존 값에서 ±0.5% 이내만
            const safeHigh = Math.min(price, currentHigh * 1.005);
            const safeLow = Math.max(price, currentLow * 0.995);
            
            newHigh = Math.max(currentHigh, Math.min(safeHigh, price));
            newLow = Math.min(currentLow, Math.max(safeLow, price));
          }
          
          await this.storage.updateCandlestick(guildId, symbol, tf, timestamp, {
            high: newHigh.toString(),
            low: newLow.toString(),
            close: price.toString(),
            volume: (candlestick.volume || 0) + volume
          });
        }
      }
    } catch (error) {
      console.error('Error updating candlestick data:', error);
    }
  }
  
  private getTimeframeTimestamp(date: Date, timeframe: string): Date {
    switch (timeframe) {
      case 'realtime':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
      case '1m':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
      case '3m':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), Math.floor(date.getMinutes() / 3) * 3);
      case '5m':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), Math.floor(date.getMinutes() / 5) * 5);
      case '10m':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), Math.floor(date.getMinutes() / 10) * 10);
      case '15m':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), Math.floor(date.getMinutes() / 15) * 15);
      case '30m':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), Math.floor(date.getMinutes() / 30) * 30);
      case '1h':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
      case '2h':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(date.getHours() / 2) * 2);
      case '4h':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(date.getHours() / 4) * 4);
      case '1d':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      case '7d':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
        return new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
      case '30d':
        return new Date(date.getFullYear(), date.getMonth(), 1);
      case '365d':
        return new Date(date.getFullYear(), 0, 1);
      default:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
    }
  }

  private async applyMarketImpact(guildId: string, symbol: string, type: 'buy' | 'sell', shares: number, tradePrice: number) {
    try {
      const stock = await this.storage.getStockBySymbol(guildId, symbol);
      if (!stock) return;

      const currentPrice = Number(stock.price);
      
      // Calculate impact based on trade size and direction
      // Base impact: 0.01% to 0.5% depending on trade size
      const baseImpact = Math.min(shares / 10000, 0.005); // Max 0.5% impact for very large trades
      const impactMultiplier = type === 'buy' ? 1 : -1; // Buy pushes price up, sell pushes down
      
      // Add small random factor for realism
      const randomFactor = (Math.random() - 0.5) * 0.001; // ±0.05% random
      
      const totalImpact = (baseImpact + randomFactor) * impactMultiplier;
      const newPrice = Math.max(1, currentPrice * (1 + totalImpact)); // Minimum price of 1 won
      
      // Update stock price
      await this.storage.updateStockPrice(guildId, symbol, newPrice);
      
      // Broadcast price change
      this.wsManager.broadcast('stock_price_updated', {
        guildId,
        symbol,
        oldPrice: currentPrice,
        newPrice,
        changePercent: (totalImpact * 100).toFixed(4),
        reason: `개인거래 영향 (${type === 'buy' ? '매수' : '매도'} ${shares}주)`
      });

    } catch (error) {
      console.error('Error applying market impact:', error);
    }
  }

  // Limit order execution methods
  async createLimitOrder(guildId: string, userId: string, symbol: string, type: 'buy' | 'sell', shares: number, targetPrice: number, expiresAt?: Date): Promise<any> {
    const stock = await this.storage.getStockBySymbol(guildId, symbol);
    if (!stock) {
      throw new Error('종목을 찾을 수 없습니다');
    }

    if (stock.status !== 'active') {
      throw new Error(`${stock.status === 'halted' ? '거래가 중지된' : '상장폐지된'} 종목입니다`);
    }

    const account = await this.storage.getAccountByUser(guildId, userId);
    if (!account) {
      throw new Error('계좌를 찾을 수 없습니다');
    }

    if (account.frozen) {
      throw new Error('계좌가 동결되어 거래할 수 없습니다');
    }

    if (account.tradingSuspended) {
      throw new Error('관리자에 의해 거래가 중지된 계좌입니다');
    }

    const totalAmount = targetPrice * shares;

    if (type === 'buy') {
      // Check balance for buy orders
      const currentBalance = Number(account.balance);
      if (currentBalance - totalAmount < 1) {
        throw new Error('잔액이 부족합니다 (거래 후 최소 1원이 남아있어야 합니다)');
      }

      // Reserve balance for the limit order
      await this.storage.updateBalance(account.id, -totalAmount);
      
      // Create limit order
      const limitOrder = await this.storage.createLimitOrder({
        guildId,
        userId,
        symbol,
        type,
        shares,
        targetPrice: targetPrice.toString(),
        totalAmount: totalAmount.toString(),
        reservedAmount: totalAmount.toString(),
        expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
      });

      // Add transaction log for reserving money
      await this.storage.addTransaction({
        guildId,
        fromUserId: userId,
        type: 'admin_freeze', // Temporary freeze for limit order
        amount: totalAmount.toString(),
        memo: `지정가 매수 주문 예약: ${symbol} ${shares}주 @ ${targetPrice}원`
      });

      return limitOrder;
    } else {
      // Check holdings for sell orders
      const holding = await this.storage.getHolding(guildId, userId, symbol);
      if (!holding || holding.shares < shares) {
        throw new Error('보유 수량이 부족합니다');
      }

      // Reserve shares for the limit order (by reducing available shares)
      await this.storage.updateHolding(guildId, userId, symbol, holding.shares - shares, Number(holding.avgPrice));

      // Create limit order
      const limitOrder = await this.storage.createLimitOrder({
        guildId,
        userId,
        symbol,
        type,
        shares,
        targetPrice: targetPrice.toString(),
        totalAmount: totalAmount.toString(),
        reservedAmount: shares.toString(), // For sell orders, reserve shares not money
        expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
      });

      return limitOrder;
    }
  }

  private async checkAndExecuteLimitOrders(guildId: string, symbol: string, currentPrice: number): Promise<void> {
    try {
      const pendingOrders = await this.storage.checkPendingOrdersForSymbol(guildId, symbol, currentPrice);
      
      for (const order of pendingOrders) {
        const targetPrice = Number(order.targetPrice);
        let shouldExecute = false;

        // ±500원 범위 내에서 체결 허용
        const priceRange = 500;
        
        if (order.type === 'buy' && currentPrice <= (targetPrice + priceRange)) {
          shouldExecute = true;
        } else if (order.type === 'sell' && currentPrice >= (targetPrice - priceRange)) {
          shouldExecute = true;
        }

        if (shouldExecute) {
          // SAFETY CHECK: Prevent extreme price execution
          // Only execute if the current price is within reasonable range of target
          const priceDeviation = Math.abs(currentPrice - targetPrice) / targetPrice;
          
          // If price deviation exceeds 15%, don't execute (flash crash protection)
          if (priceDeviation > 0.15) {
            console.log(`🚫 Flash crash protection: Blocking limit order execution for ${symbol} at ${currentPrice} (target: ${targetPrice}, deviation: ${(priceDeviation * 100).toFixed(1)}%)`);
            continue;
          }
          
          // Execute the limit order at target price (not market price for safety)
          await this.executeLimitOrderAtMarketPrice(order, targetPrice);
        }
      }
    } catch (error) {
      console.error('Error checking and executing limit orders:', error);
    }
  }

  private async executeLimitOrderAtMarketPrice(order: any, executionPrice: number): Promise<void> {
    try {
      const shares = order.shares;
      const totalExecutionAmount = executionPrice * shares;

      if (order.type === 'buy') {
        // For buy orders: user already had money reserved, now execute the trade
        const holding = await this.storage.getHolding(order.guildId, order.userId, order.symbol);
        
        if (holding) {
          const totalShares = holding.shares + shares;
          const totalValue = (holding.shares * Number(holding.avgPrice)) + totalExecutionAmount;
          const newAvgPrice = totalValue / totalShares;
          
          await this.storage.updateHolding(order.guildId, order.userId, order.symbol, totalShares, newAvgPrice);
        } else {
          await this.storage.updateHolding(order.guildId, order.userId, order.symbol, shares, executionPrice);
        }

        // If execution price was lower than target price, refund the difference
        const targetAmount = Number(order.totalAmount);
        if (totalExecutionAmount < targetAmount) {
          const account = await this.storage.getAccountByUser(order.guildId, order.userId);
          if (account) {
            await this.storage.updateBalance(account.id, targetAmount - totalExecutionAmount);
          }
        }
      } else {
        // For sell orders: user already had shares reserved, now add money to balance
        const account = await this.storage.getAccountByUser(order.guildId, order.userId);
        if (account) {
          await this.storage.updateBalance(account.id, totalExecutionAmount);
        }
      }

      // Mark order as executed
      await this.storage.executeLimitOrder(order.id, executionPrice, shares);

      // Log the stock transaction
      await this.storage.addTransaction({
        guildId: order.guildId,
        fromUserId: order.userId,
        type: order.type === 'buy' ? 'stock_buy' : 'stock_sell',
        amount: totalExecutionAmount.toString(),
        memo: `지정가 ${order.type === 'buy' ? '매수' : '매도'} 체결: ${order.symbol} ${shares}주 @ ${executionPrice}원`
      });

      // Update candlestick data for the execution
      await this.updateCandlestickData(order.guildId, order.symbol, executionPrice, shares);

      // Broadcast limit order execution
      this.wsManager.broadcast('limit_order_executed', {
        guildId: order.guildId,
        orderId: order.id,
        symbol: order.symbol,
        type: order.type,
        shares,
        targetPrice: Number(order.targetPrice),
        executionPrice,
        userId: order.userId
      });

      console.log(`Limit order executed: ${order.type} ${shares} shares of ${order.symbol} at ${executionPrice} (target: ${order.targetPrice})`);
    } catch (error) {
      console.error('Error executing limit order:', error);
    }
  }
}
