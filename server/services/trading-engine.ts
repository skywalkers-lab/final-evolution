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
    // Start price simulation every 1.25 seconds
    this.priceSimulationInterval = setInterval(() => {
      this.simulatePriceMovements();
    }, 1250); // 1.25초마다 업데이트

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
      
      // Apply market impact - individual trades affect stock price
      await this.applyMarketImpact(guildId, symbol, type, shares, price);
      
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
      
      // Apply market impact - individual trades affect stock price
      await this.applyMarketImpact(guildId, symbol, type, shares, price);
      
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
      // Get all active stocks across all guilds
      const activeStocks = await this.storage.getAllActiveStocks();
      
      for (const stock of activeStocks) {
        if (stock.status === 'active') {
          const currentPrice = Number(stock.price);
          const volatility = Number(stock.volatility || 1); // 기본 변동률 1%
          
          // 더 현실적인 가격 변동 - 큰 변동은 드물게
          const randomFactor = Math.random();
          let changePercent;
          
          if (randomFactor < 0.8) {
            // 80% 확률로 작은 변동 (volatility의 10% 이내)
            changePercent = (Math.random() - 0.5) * (volatility * 0.2 / 100);
          } else if (randomFactor < 0.95) {
            // 15% 확률로 중간 변동 (volatility의 50% 이내)
            changePercent = (Math.random() - 0.5) * (volatility * 1.0 / 100);
          } else {
            // 5% 확률로 큰 변동 (full volatility)
            changePercent = (Math.random() - 0.5) * (volatility * 2 / 100);
          }
          
          const newPrice = Math.max(100, Math.round(currentPrice * (1 + changePercent))); // 최소 100원
          
          // 거래량도 더 현실적으로 계산
          const baseVolume = Math.floor(Math.random() * 5000) + 500; // 500~5500주
          const volumeMultiplier = Math.abs(changePercent) * 10 + 1; // 변동이 클수록 거래량 증가
          const finalVolume = Math.round(baseVolume * volumeMultiplier);
          
          // Always update candlestick data with current price (for real-time progression)
          await this.updateCandlestickData(stock.guildId, stock.symbol, newPrice, finalVolume);
          
          if (newPrice !== currentPrice) {
            await this.storage.updateStockPrice(stock.guildId, stock.symbol, newPrice);
            
            // Broadcast price update
            this.wsManager.broadcast('stock_price_updated', {
              guildId: stock.guildId,
              symbol: stock.symbol,
              oldPrice: currentPrice,
              newPrice,
              changePercent: changePercent * 100
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in price simulation:', error);
    }
  }

  private async updateCandlestickData(guildId: string, symbol: string, price: number, volume: number) {
    try {
      const now = new Date();
      
      // Update multiple timeframes for real-time progression
      const timeframes = [
        { tf: 'realtime', interval: 1 }, // Every minute for real-time
        { tf: '1h', interval: 60 }, // Every hour
        { tf: '6h', interval: 360 }, // Every 6 hours
        { tf: '12h', interval: 720 }, // Every 12 hours
        { tf: '1d', interval: 1440 }, // Every day
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
          // Update existing candlestick
          await this.storage.updateCandlestick(guildId, symbol, tf, timestamp, {
            high: Math.max(Number(candlestick.high), price).toString(),
            low: Math.min(Number(candlestick.low), price).toString(),
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
      case '1h':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
      case '6h':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(date.getHours() / 6) * 6);
      case '12h':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(date.getHours() / 12) * 12);
      case '1d':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      case '2w':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
        return new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
      case '1m':
        return new Date(date.getFullYear(), date.getMonth(), 1);
      case '6m':
        return new Date(date.getFullYear(), Math.floor(date.getMonth() / 6) * 6, 1);
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
}
