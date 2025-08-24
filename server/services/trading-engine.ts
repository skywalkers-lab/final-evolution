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
      // Get all active stocks across all guilds
      const activeStocks = await this.storage.getAllActiveStocks();
      
      for (const stock of activeStocks) {
        if (stock.status === 'active') {
          const currentPrice = Number(stock.price);
          const volatility = Number(stock.volatility || 1); // 기본 변동률 1%
          
          // 완전 안전 가격 변동 (극소 변동만)
          const changePercent = (Math.random() - 0.5) * 0.0005; // ±0.025% (극소!)
          
          // 절대적 안전 범위 (현재가 기준 ±0.5%)
          const minPrice = Math.max(1000, Math.round(currentPrice * 0.995));
          const maxPrice = Math.round(currentPrice * 1.005);
          const targetPrice = Math.round(currentPrice * (1 + changePercent));
          const newPrice = Math.max(minPrice, Math.min(maxPrice, targetPrice));
          
          // 거래량도 더 현실적으로 계산
          const baseVolume = Math.floor(Math.random() * 5000) + 500; // 500~5500주
          const volumeMultiplier = Math.abs(changePercent) * 10 + 1; // 변동이 클수록 거래량 증가
          const finalVolume = Math.round(baseVolume * volumeMultiplier);
          
          // Only update candlestick data if price actually changed
          if (newPrice !== currentPrice) {
            await this.updateCandlestickData(stock.guildId, stock.symbol, newPrice, finalVolume);
          }
          
          if (newPrice !== currentPrice) {
            await this.storage.updateStockPrice(stock.guildId, stock.symbol, newPrice);
            
            // Check and execute limit orders after price update
            await this.checkAndExecuteLimitOrders(stock.guildId, stock.symbol, newPrice);
            
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
        amount: totalAmount,
        description: `지정가 매수 주문 예약: ${symbol} ${shares}주 @ ${targetPrice}원`
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

        if (order.type === 'buy' && currentPrice <= targetPrice) {
          shouldExecute = true;
        } else if (order.type === 'sell' && currentPrice >= targetPrice) {
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
      await this.storage.addStockTransaction({
        guildId: order.guildId,
        userId: order.userId,
        symbol: order.symbol,
        type: order.type,
        shares,
        price: executionPrice.toString(),
        totalAmount: totalExecutionAmount.toString()
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
