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
    // Start price simulation every 5 seconds
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
          
          // Random price movement ±3%
          const changePercent = (Math.random() - 0.5) * 0.06; // -3% to +3%
          const newPrice = Math.max(1, Math.floor(currentPrice * (1 + changePercent)));
          
          if (newPrice !== currentPrice) {
            await this.storage.updateStockPrice(stock.guildId, stock.symbol, newPrice);
            
            // Update candlestick data
            await this.updateCandlestickData(stock.guildId, stock.symbol, newPrice, 0);
            
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
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      
      // Get or create current hour's candlestick
      let candlestick = await this.storage.getCandlestick(guildId, symbol, '1h', currentHour);
      
      if (!candlestick) {
        // Create new candlestick
        await this.storage.createCandlestick({
          guildId,
          symbol,
          timeframe: '1h',
          timestamp: currentHour,
          open: price.toString(),
          high: price.toString(),
          low: price.toString(),
          close: price.toString(),
          volume
        });
      } else {
        // Update existing candlestick
        await this.storage.updateCandlestick(guildId, symbol, '1h', currentHour, {
          high: Math.max(Number(candlestick.high), price).toString(),
          low: Math.min(Number(candlestick.low), price).toString(),
          close: price.toString(),
          volume: (candlestick.volume || 0) + volume
        });
      }
    } catch (error) {
      console.error('Error updating candlestick data:', error);
    }
  }
}
