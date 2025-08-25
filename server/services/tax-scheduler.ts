import cron from 'node-cron';
import { IStorage } from '../storage';
import { WebSocketManager } from './websocket-manager';

export class TaxScheduler {
  private storage: IStorage;
  private wsManager: WebSocketManager;

  constructor(storage: IStorage, wsManager: WebSocketManager) {
    this.storage = storage;
    this.wsManager = wsManager;
  }

  start() {
    // Schedule tax collection on 1st of every month at 00:00
    cron.schedule('0 0 15 * *', async () => {
      await this.collectTaxes();
    });

    console.log('Tax scheduler started - will collect taxes on 15th of each month');
  }

  async collectTaxes() {
    console.log('Starting monthly tax collection...');
    
    try {
      const guilds = await this.storage.getAllGuilds();
      
      for (const guild of guilds) {
        const settings = await this.storage.getGuildSettings(guild.guildId);
        if (!settings || Number(settings.taxRate) <= 0) {
          continue;
        }

        const taxRate = Number(settings.taxRate) / 100;
        const accounts = await this.storage.getAccountsByGuild(guild.guildId);
        
        for (const account of accounts) {
          // Calculate total assets (cash + stock value)
          const totalAssets = await this.calculateTotalAssets(guild.guildId, account.userId);
          
          // Skip if total assets <= 1000 won (tax-free threshold)
          if (totalAssets <= 1000) {
            continue;
          }

          const currentBalance = Number(account.balance);
          
          // Calculate basic tax
          const basicTaxAmount = Math.floor(totalAssets * taxRate);
          const basicCollectableAmount = Math.min(basicTaxAmount, Math.floor((currentBalance - 1) * 0.7)); // Leave room for progressive tax
          
          // Calculate progressive tax (5% for assets over 60M won)
          const progressiveTaxThreshold = 60000000; // 6000만원
          let progressiveTaxAmount = 0;
          let progressiveCollectableAmount = 0;
          
          if (totalAssets > progressiveTaxThreshold) {
            progressiveTaxAmount = Math.floor(totalAssets * 0.05); // 5% progressive tax
            const remainingBalance = currentBalance - basicCollectableAmount - 1;
            progressiveCollectableAmount = Math.min(progressiveTaxAmount, remainingBalance);
          }

          // Collect basic tax
          if (basicCollectableAmount > 0) {
            await this.storage.addTransaction({
              guildId: guild.guildId,
              fromUserId: account.userId,
              type: 'tax',
              amount: basicCollectableAmount.toString(),
              memo: '월간 자동 세금 징수 - 국세청'
            });

            await this.storage.updateBalance(account.id, -basicCollectableAmount);
            
            // Get user info for broadcast
            const user = await this.storage.getUser(account.userId);
            if (user) {
              // Broadcast basic tax collection to WebSocket clients
              this.wsManager.broadcast('tax_collected', {
                guildId: guild.guildId,
                userId: account.userId,
                username: user.username,
                amount: basicCollectableAmount,
                timestamp: new Date().toISOString(),
                type: 'basic'
              });
            }
          }

          // Collect progressive tax
          if (progressiveCollectableAmount > 0) {
            await this.storage.addTransaction({
              guildId: guild.guildId,
              fromUserId: account.userId,
              type: 'tax',
              amount: progressiveCollectableAmount.toString(),
              memo: '누진세 징수 - 고액자산 (6000만원 이상)'
            });

            await this.storage.updateBalance(account.id, -progressiveCollectableAmount);
            
            // Get user info for broadcast
            const user = await this.storage.getUser(account.userId);
            if (user) {
              // Broadcast progressive tax collection to WebSocket clients
              this.wsManager.broadcast('tax_collected', {
                guildId: guild.guildId,
                userId: account.userId,
                username: user.username,
                amount: progressiveCollectableAmount,
                timestamp: new Date().toISOString(),
                type: 'progressive'
              });
            }
          }
        }
      }
      
      console.log('Monthly tax collection completed');
    } catch (error) {
      console.error('Error during tax collection:', error);
    }
  }

  async collectTaxManually(guildId: string) {
    const settings = await this.storage.getGuildSettings(guildId);
    if (!settings || Number(settings.taxRate) <= 0) {
      throw new Error('세율이 설정되지 않았습니다');
    }

    const taxRate = Number(settings.taxRate) / 100;
    const accounts = await this.storage.getAccountsByGuild(guildId);
    
    let totalCollected = 0;
    let affectedUsers = 0;
    
    for (const account of accounts) {
      const totalAssets = await this.calculateTotalAssets(guildId, account.userId);
      
      if (totalAssets <= 1000) {
        continue;
      }

      const currentBalance = Number(account.balance);
      
      // Calculate basic tax
      const basicTaxAmount = Math.floor(totalAssets * taxRate);
      const basicCollectableAmount = Math.min(basicTaxAmount, Math.floor((currentBalance - 1) * 0.7)); // Leave room for progressive tax
      
      // Calculate progressive tax (5% for assets over 60M won)
      const progressiveTaxThreshold = 60000000; // 6000만원
      let progressiveTaxAmount = 0;
      let progressiveCollectableAmount = 0;
      
      if (totalAssets > progressiveTaxThreshold) {
        progressiveTaxAmount = Math.floor(totalAssets * 0.05); // 5% progressive tax
        const remainingBalance = currentBalance - basicCollectableAmount - 1;
        progressiveCollectableAmount = Math.min(progressiveTaxAmount, remainingBalance);
      }

      // Collect basic tax
      if (basicCollectableAmount > 0) {
        await this.storage.addTransaction({
          guildId,
          fromUserId: account.userId,
          type: 'tax',
          amount: basicCollectableAmount.toString(),
          memo: '수동 세금 징수'
        });

        await this.storage.updateBalance(account.id, -basicCollectableAmount);
        
        // Get user info for broadcast
        const user = await this.storage.getUser(account.userId);
        if (user) {
          // Broadcast manual basic tax collection to WebSocket clients
          this.wsManager.broadcast('tax_collected', {
            guildId,
            userId: account.userId,
            username: user.username,
            amount: basicCollectableAmount,
            timestamp: new Date().toISOString(),
            type: 'basic'
          });
        }
        
        totalCollected += basicCollectableAmount;
        affectedUsers++;
      }

      // Collect progressive tax
      if (progressiveCollectableAmount > 0) {
        await this.storage.addTransaction({
          guildId,
          fromUserId: account.userId,
          type: 'tax',
          amount: progressiveCollectableAmount.toString(),
          memo: '누진세 징수 - 고액자산 (6000만원 이상)'
        });

        await this.storage.updateBalance(account.id, -progressiveCollectableAmount);
        
        // Get user info for broadcast
        const user = await this.storage.getUser(account.userId);
        if (user) {
          // Broadcast manual progressive tax collection to WebSocket clients
          this.wsManager.broadcast('tax_collected', {
            guildId,
            userId: account.userId,
            username: user.username,
            amount: progressiveCollectableAmount,
            timestamp: new Date().toISOString(),
            type: 'progressive'
          });
        }
        
        totalCollected += progressiveCollectableAmount;
        if (basicCollectableAmount === 0) affectedUsers++; // Only count once per user
      }
    }

    return {
      totalCollected,
      affectedUsers,
      taxRate: Number(settings.taxRate)
    };
  }

  private async calculateTotalAssets(guildId: string, userId: string): Promise<number> {
    const account = await this.storage.getAccountByUser(guildId, userId);
    const holdings = await this.storage.getHoldingsByUser(guildId, userId);
    
    let totalAssets = Number(account?.balance || 0);
    
    for (const holding of holdings) {
      const stock = await this.storage.getStockBySymbol(guildId, holding.symbol);
      if (stock && stock.status !== 'delisted') {
        totalAssets += Number(stock.price) * holding.shares;
      }
    }
    
    return totalAssets;
  }
}
