import cron from 'node-cron';
import { IStorage } from '../storage';

export class TaxScheduler {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  start() {
    // Schedule tax collection on 1st of every month at 00:00
    cron.schedule('0 0 1 * *', async () => {
      await this.collectTaxes();
    });

    console.log('Tax scheduler started - will collect taxes on 1st of each month');
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

          const taxAmount = Math.floor(totalAssets * taxRate);
          const currentBalance = Number(account.balance);
          
          // Only collect tax from cash balance, maintain minimum 1 won
          const collectableAmount = Math.min(taxAmount, currentBalance - 1);
          
          if (collectableAmount > 0) {
            await this.storage.addTransaction({
              guildId: guild.guildId,
              fromUserId: account.userId,
              type: 'tax',
              amount: collectableAmount.toString(),
              memo: '월간 자동 세금 징수'
            });

            await this.storage.updateBalance(account.id, -collectableAmount);
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

      const taxAmount = Math.floor(totalAssets * taxRate);
      const currentBalance = Number(account.balance);
      const collectableAmount = Math.min(taxAmount, currentBalance - 1);
      
      if (collectableAmount > 0) {
        await this.storage.addTransaction({
          guildId,
          fromUserId: account.userId,
          type: 'tax',
          amount: collectableAmount.toString(),
          memo: '수동 세금 징수'
        });

        await this.storage.updateBalance(account.id, -collectableAmount);
        
        totalCollected += collectableAmount;
        affectedUsers++;
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
