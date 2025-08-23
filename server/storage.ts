import { 
  users, accounts, transactions, stocks, holdings, stockTransactions, 
  candlestickData, newsAnalyses, auctions, auctionBids, escrows, 
  auditLogs, guildSettings, guildAdmins, auctionPasswords,
  type User, type InsertUser, type Account, type InsertAccount,
  type Transaction, type InsertTransaction, type Stock, type InsertStock,
  type Holding, type InsertHolding, type StockTransaction, type InsertStockTransaction,
  type CandlestickData, type InsertCandlestickData, type NewsAnalysis, type InsertNewsAnalysis,
  type Auction, type InsertAuction, type AuctionBid, type InsertAuctionBid,
  type Escrow, type InsertEscrow, type AuditLog, type InsertAuditLog,
  type GuildSettings, type InsertGuildSettings, type GuildAdmin, type InsertGuildAdmin,
  type AuctionPassword, type InsertAuctionPassword
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, gt, lt, asc } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Account management
  getAccount(id: string): Promise<Account | undefined>;
  getAccountByUser(guildId: string, userId: string): Promise<Account | undefined>;
  getAccountByUniqueCode(guildId: string, uniqueCode: string): Promise<Account | undefined>;
  getAccountsByGuild(guildId: string): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateBalance(accountId: string, amount: number): Promise<void>;
  freezeAccount(accountId: string, frozen: boolean): Promise<void>;
  suspendAccountTrading(guildId: string, userId: string, suspended: boolean): Promise<void>;
  resetAllAccounts(guildId: string): Promise<void>;

  // Transactions
  addTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(guildId: string, userId: string, limit?: number): Promise<Transaction[]>;
  getTransactionHistory(guildId: string, options: { userId?: string; type?: string; limit?: number }): Promise<Transaction[]>;
  getRecentTransactions(guildId: string, limit: number): Promise<Transaction[]>;
  transferMoney(guildId: string, fromUserId: string, toUserId: string, amount: number, memo: string): Promise<void>;

  // Stock management
  getStocks(): Promise<Stock[]>;
  getStocksByGuild(guildId: string): Promise<Stock[]>;
  getStock(id: string): Promise<Stock | undefined>;
  getStockBySymbol(guildId: string, symbol: string): Promise<Stock | undefined>;
  createStock(stock: InsertStock): Promise<Stock>;
  updateStock(id: string, updates: Partial<Stock>): Promise<Stock | undefined>;
  updateStockPrice(guildId: string, symbol: string, price: number): Promise<Stock | undefined>;
  updateStockStatus(guildId: string, symbol: string, status: 'active' | 'halted' | 'delisted'): Promise<Stock | undefined>;
  updateStockVolatility(guildId: string, symbol: string, volatility: number): Promise<Stock | undefined>;
  deleteStock(id: string): Promise<void>;
  getAllActiveStocks(): Promise<Stock[]>;

  // Holdings and stock transactions
  getHolding(guildId: string, userId: string, symbol: string): Promise<Holding | undefined>;
  getHoldingsByUser(guildId: string, userId: string): Promise<Holding[]>;
  updateHolding(guildId: string, userId: string, symbol: string, shares: number, avgPrice: number): Promise<void>;
  getStockTransactionsByUser(guildId: string, userId: string): Promise<StockTransaction[]>;
  executeTrade(guildId: string, userId: string, symbol: string, type: 'buy' | 'sell', shares: number, price: number): Promise<StockTransaction>;
  transferStock(guildId: string, fromUserId: string, toUserId: string, symbol: string, shares: number): Promise<void>;

  // Candlestick data
  getCandlestickData(guildId: string, symbol: string, timeframe: string, limit: number): Promise<CandlestickData[]>;
  getCandlestick(guildId: string, symbol: string, timeframe: string, timestamp: Date): Promise<CandlestickData | undefined>;
  createCandlestick(data: InsertCandlestickData): Promise<CandlestickData>;
  updateCandlestick(guildId: string, symbol: string, timeframe: string, timestamp: Date, updates: Partial<CandlestickData>): Promise<void>;

  // News analysis
  addNewsAnalysis(analysis: InsertNewsAnalysis): Promise<NewsAnalysis>;
  getNewsAnalyses(guildId: string, limit?: number): Promise<NewsAnalysis[]>;
  getNewsAnalysesBySymbol(guildId: string, symbol: string, limit?: number): Promise<NewsAnalysis[]>;
  analyzeNews(guildId: string, title: string, content: string, symbol?: string, createdBy?: string): Promise<NewsAnalysis>;

  // Guild settings
  getGuildSettings(guildId: string): Promise<GuildSettings | undefined>;
  updateGuildSettings(guildId: string, updates: Partial<GuildSettings>): Promise<GuildSettings>;
  updateGuildSetting(guildId: string, key: string, value: any): Promise<void>;
  getAllGuilds(): Promise<{ guildId: string }[]>;
  setAdminPassword(guildId: string, password: string): Promise<void>;

  // Guild admin management
  grantGuildAdmin(guildId: string, userId: string, discordUserId: string, grantedBy: string): Promise<GuildAdmin>;
  removeGuildAdmin(guildId: string, userId: string): Promise<void>;
  isGuildAdmin(guildId: string, discordUserId: string): Promise<boolean>;
  getGuildAdmins(guildId: string): Promise<GuildAdmin[]>;

  // Auctions
  createAuction(auction: InsertAuction): Promise<Auction>;
  getAuctionById(id: string): Promise<Auction | undefined>;
  getAuctionsByGuild(guildId: string, options?: { status?: string }): Promise<Auction[]>;
  getAllLiveAuctions(): Promise<Auction[]>;
  updateAuctionStatus(auctionId: string, status: 'scheduled' | 'live' | 'ended' | 'canceled'): Promise<void>;
  extendAuction(auctionId: string, newEndTime: Date): Promise<void>;

  // Auction bids and escrow
  placeBid(guildId: string, auctionId: string, userId: string, amount: number): Promise<AuctionBid>;
  placeBidWithEscrow(guildId: string, auctionId: string, userId: string, amount: number): Promise<AuctionBid>;
  getTopBid(auctionId: string): Promise<AuctionBid | undefined>;
  releaseEscrow(escrowId: string): Promise<void>;
  releaseAllEscrows(auctionId: string): Promise<void>;
  captureEscrow(escrowId: string): Promise<void>;
  settleAuction(auctionId: string, winnerId: string): Promise<void>;

  // Auction passwords
  createAuctionPassword(password: InsertAuctionPassword): Promise<AuctionPassword>;
  getAuctionPassword(guildId: string, password: string): Promise<AuctionPassword | undefined>;
  markAuctionPasswordAsUsed(id: string): Promise<void>;
  cleanupExpiredAuctionPasswords(): Promise<void>;

  // Audit logs
  addAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Account methods
  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async getAccountByUser(guildId: string, userId: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts)
      .where(and(eq(accounts.guildId, guildId), eq(accounts.userId, userId)));
    return account || undefined;
  }

  async getAccountByUniqueCode(guildId: string, uniqueCode: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts)
      .where(and(eq(accounts.guildId, guildId), eq(accounts.uniqueCode, uniqueCode)));
    return account || undefined;
  }

  async getAccountsByGuild(guildId: string): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.guildId, guildId));
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db.insert(accounts).values(insertAccount).returning();
    return account;
  }

  async updateBalance(accountId: string, amount: number): Promise<void> {
    await db.update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount}` })
      .where(eq(accounts.id, accountId));
  }

  async freezeAccount(accountId: string, frozen: boolean): Promise<void> {
    await db.update(accounts).set({ frozen }).where(eq(accounts.id, accountId));
  }

  async suspendAccountTrading(guildId: string, userId: string, suspended: boolean): Promise<void> {
    await db.update(accounts)
      .set({ tradingSuspended: suspended })
      .where(and(eq(accounts.guildId, guildId), eq(accounts.userId, userId)));
  }

  async resetAllAccounts(guildId: string): Promise<void> {
    await db.update(accounts).set({ balance: "0" }).where(eq(accounts.guildId, guildId));
  }

  // Transaction methods
  async addTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [result] = await db.insert(transactions).values(transaction).returning();
    return result;
  }

  async getTransactionsByUser(guildId: string, userId: string, limit = 50): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(and(
        eq(transactions.guildId, guildId),
        or(eq(transactions.fromUserId, userId), eq(transactions.toUserId, userId))
      ))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async getTransactionHistory(guildId: string, options: { userId?: string; type?: string; limit?: number }): Promise<Transaction[]> {
    const conditions = [eq(transactions.guildId, guildId)];
    
    if (options.userId) {
      conditions.push(or(
        eq(transactions.fromUserId, options.userId),
        eq(transactions.toUserId, options.userId)
      )!);
    }
    
    if (options.type) {
      conditions.push(eq(transactions.type, options.type as any));
    }

    return await db.select().from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt))
      .limit(options.limit || 50);
  }

  async getRecentTransactions(guildId: string, limit: number): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.guildId, guildId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async transferMoney(guildId: string, fromUserId: string, toUserId: string, amount: number, memo: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Get accounts
      const [fromAccount] = await tx.select().from(accounts)
        .where(and(eq(accounts.guildId, guildId), eq(accounts.userId, fromUserId)));
      const [toAccount] = await tx.select().from(accounts)
        .where(and(eq(accounts.guildId, guildId), eq(accounts.userId, toUserId)));

      if (!fromAccount || !toAccount) {
        throw new Error('계좌를 찾을 수 없습니다');
      }

      if (Number(fromAccount.balance) - amount < 1) {
        throw new Error('잔액이 부족합니다');
      }

      // Update balances
      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance} - ${amount}` })
        .where(eq(accounts.id, fromAccount.id));

      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance} + ${amount}` })
        .where(eq(accounts.id, toAccount.id));

      // Add transactions
      await tx.insert(transactions).values({
        guildId,
        fromUserId,
        toUserId,
        type: 'transfer_out',
        amount: amount.toString(),
        memo
      });

      await tx.insert(transactions).values({
        guildId,
        fromUserId,
        toUserId,
        type: 'transfer_in',
        amount: amount.toString(),
        memo
      });
    });
  }

  // Stock methods
  async getStocks(): Promise<Stock[]> {
    return await db.select().from(stocks);
  }

  async getStocksByGuild(guildId: string): Promise<Stock[]> {
    return await db.select().from(stocks).where(eq(stocks.guildId, guildId));
  }

  async getStock(id: string): Promise<Stock | undefined> {
    const [stock] = await db.select().from(stocks).where(eq(stocks.id, id));
    return stock || undefined;
  }

  async getStockBySymbol(guildId: string, symbol: string): Promise<Stock | undefined> {
    const [stock] = await db.select().from(stocks)
      .where(and(eq(stocks.guildId, guildId), eq(stocks.symbol, symbol)));
    return stock || undefined;
  }

  async createStock(stock: InsertStock): Promise<Stock> {
    const [result] = await db.insert(stocks).values(stock).returning();
    return result;
  }

  async updateStock(id: string, updates: Partial<Stock>): Promise<Stock | undefined> {
    const [result] = await db.update(stocks).set(updates).where(eq(stocks.id, id)).returning();
    return result || undefined;
  }

  async updateStockPrice(guildId: string, symbol: string, price: number): Promise<Stock | undefined> {
    const [result] = await db.update(stocks)
      .set({ price: price.toString() })
      .where(and(eq(stocks.guildId, guildId), eq(stocks.symbol, symbol)))
      .returning();
    return result || undefined;
  }

  async updateStockStatus(guildId: string, symbol: string, status: 'active' | 'halted' | 'delisted'): Promise<Stock | undefined> {
    const [result] = await db.update(stocks)
      .set({ status })
      .where(and(eq(stocks.guildId, guildId), eq(stocks.symbol, symbol)))
      .returning();
    return result || undefined;
  }

  async updateStockVolatility(guildId: string, symbol: string, volatility: number): Promise<Stock | undefined> {
    const [result] = await db.update(stocks)
      .set({ volatility: volatility.toString() })
      .where(and(eq(stocks.guildId, guildId), eq(stocks.symbol, symbol)))
      .returning();
    return result || undefined;
  }

  async deleteStock(id: string): Promise<void> {
    await db.delete(stocks).where(eq(stocks.id, id));
  }

  async getAllActiveStocks(): Promise<Stock[]> {
    return await db.select().from(stocks).where(eq(stocks.status, 'active'));
  }

  // Holdings and trading methods
  async getHolding(guildId: string, userId: string, symbol: string): Promise<Holding | undefined> {
    const [holding] = await db.select().from(holdings)
      .where(and(
        eq(holdings.guildId, guildId),
        eq(holdings.userId, userId),
        eq(holdings.symbol, symbol)
      ));
    return holding || undefined;
  }

  async getHoldingsByUser(guildId: string, userId: string): Promise<Holding[]> {
    return await db.select().from(holdings)
      .where(and(eq(holdings.guildId, guildId), eq(holdings.userId, userId)));
  }

  async updateHolding(guildId: string, userId: string, symbol: string, shares: number, avgPrice: number): Promise<void> {
    const existing = await this.getHolding(guildId, userId, symbol);
    
    if (existing) {
      if (shares === 0) {
        await db.delete(holdings).where(eq(holdings.id, existing.id));
      } else {
        await db.update(holdings)
          .set({ shares, avgPrice: avgPrice.toString() })
          .where(eq(holdings.id, existing.id));
      }
    } else if (shares > 0) {
      await db.insert(holdings).values({
        guildId,
        userId,
        symbol,
        shares,
        avgPrice: avgPrice.toString()
      });
    }
  }

  async getStockTransactionsByUser(guildId: string, userId: string): Promise<StockTransaction[]> {
    return await db.select().from(stockTransactions)
      .where(and(eq(stockTransactions.guildId, guildId), eq(stockTransactions.userId, userId)))
      .orderBy(desc(stockTransactions.createdAt));
  }

  async executeTrade(guildId: string, userId: string, symbol: string, type: 'buy' | 'sell', shares: number, price: number): Promise<StockTransaction> {
    const totalAmount = shares * price;

    return await db.transaction(async (tx) => {
      // Get account and holding
      const [account] = await tx.select().from(accounts)
        .where(and(eq(accounts.guildId, guildId), eq(accounts.userId, userId)));
      
      if (!account) {
        throw new Error('계좌를 찾을 수 없습니다');
      }

      if (type === 'buy') {
        // Check balance
        if (Number(account.balance) - totalAmount < 1) {
          throw new Error('잔액이 부족합니다');
        }

        // Update balance
        await tx.update(accounts)
          .set({ balance: sql`${accounts.balance} - ${totalAmount}` })
          .where(eq(accounts.id, account.id));

        // Update holdings
        const [holding] = await tx.select().from(holdings)
          .where(and(
            eq(holdings.guildId, guildId),
            eq(holdings.userId, userId),
            eq(holdings.symbol, symbol)
          ));

        if (holding) {
          const totalShares = holding.shares + shares;
          const totalValue = (holding.shares * Number(holding.avgPrice)) + totalAmount;
          const newAvgPrice = totalValue / totalShares;

          await tx.update(holdings)
            .set({ shares: totalShares, avgPrice: newAvgPrice.toString() })
            .where(eq(holdings.id, holding.id));
        } else {
          await tx.insert(holdings).values({
            guildId,
            userId,
            symbol,
            shares,
            avgPrice: price.toString()
          });
        }
      } else {
        // Check holdings
        const [holding] = await tx.select().from(holdings)
          .where(and(
            eq(holdings.guildId, guildId),
            eq(holdings.userId, userId),
            eq(holdings.symbol, symbol)
          ));

        if (!holding || holding.shares < shares) {
          throw new Error('보유 수량이 부족합니다');
        }

        // Update balance
        await tx.update(accounts)
          .set({ balance: sql`${accounts.balance} + ${totalAmount}` })
          .where(eq(accounts.id, account.id));

        // Update holdings
        const remainingShares = holding.shares - shares;
        if (remainingShares === 0) {
          await tx.delete(holdings).where(eq(holdings.id, holding.id));
        } else {
          await tx.update(holdings)
            .set({ shares: remainingShares })
            .where(eq(holdings.id, holding.id));
        }
      }

      // Add stock transaction
      const [stockTx] = await tx.insert(stockTransactions).values({
        guildId,
        userId,
        symbol,
        type,
        shares,
        price: price.toString(),
        totalAmount: totalAmount.toString()
      }).returning();

      // Add general transaction
      await tx.insert(transactions).values({
        guildId,
        actorId: userId,
        type: type === 'buy' ? 'stock_buy' : 'stock_sell',
        amount: totalAmount.toString(),
        memo: `${symbol} ${shares}주 ${type === 'buy' ? '매수' : '매도'}`
      });

      return stockTx;
    });
  }

  async transferStock(guildId: string, fromUserId: string, toUserId: string, symbol: string, shares: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Get source holding
      const [fromHolding] = await tx.select().from(holdings)
        .where(and(
          eq(holdings.guildId, guildId),
          eq(holdings.userId, fromUserId),
          eq(holdings.symbol, symbol)
        ));

      if (!fromHolding || fromHolding.shares < shares) {
        throw new Error('보유 수량이 부족합니다');
      }

      // Update source holding
      const remainingShares = fromHolding.shares - shares;
      if (remainingShares === 0) {
        await tx.delete(holdings).where(eq(holdings.id, fromHolding.id));
      } else {
        await tx.update(holdings)
          .set({ shares: remainingShares })
          .where(eq(holdings.id, fromHolding.id));
      }

      // Update target holding
      const [toHolding] = await tx.select().from(holdings)
        .where(and(
          eq(holdings.guildId, guildId),
          eq(holdings.userId, toUserId),
          eq(holdings.symbol, symbol)
        ));

      if (toHolding) {
        await tx.update(holdings)
          .set({ shares: toHolding.shares + shares })
          .where(eq(holdings.id, toHolding.id));
      } else {
        await tx.insert(holdings).values({
          guildId,
          userId: toUserId,
          symbol,
          shares,
          avgPrice: fromHolding.avgPrice
        });
      }
    });
  }

  // Candlestick methods
  async getCandlestickData(guildId: string, symbol: string, timeframe: string, limit: number): Promise<CandlestickData[]> {
    return await db.select().from(candlestickData)
      .where(and(
        eq(candlestickData.guildId, guildId),
        eq(candlestickData.symbol, symbol),
        eq(candlestickData.timeframe, timeframe)
      ))
      .orderBy(desc(candlestickData.timestamp))
      .limit(limit);
  }

  async getCandlestick(guildId: string, symbol: string, timeframe: string, timestamp: Date): Promise<CandlestickData | undefined> {
    const [candle] = await db.select().from(candlestickData)
      .where(and(
        eq(candlestickData.guildId, guildId),
        eq(candlestickData.symbol, symbol),
        eq(candlestickData.timeframe, timeframe),
        eq(candlestickData.timestamp, timestamp)
      ));
    return candle || undefined;
  }

  async createCandlestick(data: InsertCandlestickData): Promise<CandlestickData> {
    const [result] = await db.insert(candlestickData).values(data).returning();
    return result;
  }

  async updateCandlestick(guildId: string, symbol: string, timeframe: string, timestamp: Date, updates: Partial<CandlestickData>): Promise<void> {
    await db.update(candlestickData)
      .set(updates)
      .where(and(
        eq(candlestickData.guildId, guildId),
        eq(candlestickData.symbol, symbol),
        eq(candlestickData.timeframe, timeframe),
        eq(candlestickData.timestamp, timestamp)
      ));
  }

  // News analysis methods
  async addNewsAnalysis(analysis: InsertNewsAnalysis): Promise<NewsAnalysis> {
    const [result] = await db.insert(newsAnalyses).values(analysis).returning();
    return result;
  }

  async getNewsAnalyses(guildId: string, limit = 50): Promise<NewsAnalysis[]> {
    return await db.select().from(newsAnalyses)
      .where(eq(newsAnalyses.guildId, guildId))
      .orderBy(desc(newsAnalyses.createdAt))
      .limit(limit);
  }

  async getNewsAnalysesBySymbol(guildId: string, symbol: string, limit = 50): Promise<NewsAnalysis[]> {
    return await db.select().from(newsAnalyses)
      .where(and(eq(newsAnalyses.guildId, guildId), eq(newsAnalyses.symbol, symbol)))
      .orderBy(desc(newsAnalyses.createdAt))
      .limit(limit);
  }

  async analyzeNews(guildId: string, title: string, content: string, symbol?: string, createdBy?: string): Promise<NewsAnalysis> {
    // This would be implemented with the news analyzer service
    // For now, just save the raw analysis
    const analysis = await this.addNewsAnalysis({
      guildId,
      symbol,
      title,
      content,
      sentiment: 'neutral',
      sentimentScore: "0",
      priceImpact: "0",
      createdBy
    });
    return analysis;
  }

  // Guild settings methods
  async getGuildSettings(guildId: string): Promise<GuildSettings | undefined> {
    const [settings] = await db.select().from(guildSettings)
      .where(eq(guildSettings.guildId, guildId));
    return settings || undefined;
  }

  async updateGuildSettings(guildId: string, updates: Partial<GuildSettings>): Promise<GuildSettings> {
    const existing = await this.getGuildSettings(guildId);
    
    if (existing) {
      const [result] = await db.update(guildSettings)
        .set(updates)
        .where(eq(guildSettings.guildId, guildId))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(guildSettings)
        .values({ guildId, ...updates })
        .returning();
      return result;
    }
  }

  async updateGuildSetting(guildId: string, key: string, value: any): Promise<void> {
    const updates: any = {};
    updates[key] = value;
    await this.updateGuildSettings(guildId, updates);
  }

  async getAllGuilds(): Promise<{ guildId: string }[]> {
    return await db.selectDistinct({ guildId: guildSettings.guildId }).from(guildSettings);
  }

  async setAdminPassword(guildId: string, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.updateGuildSettings(guildId, { adminPassword: hashedPassword });
  }

  // Guild admin management methods
  async grantGuildAdmin(guildId: string, userId: string, discordUserId: string, grantedBy: string): Promise<GuildAdmin> {
    const [admin] = await db.insert(guildAdmins).values({
      guildId,
      userId,
      discordUserId,
      grantedBy,
    }).returning();
    
    return admin;
  }

  async removeGuildAdmin(guildId: string, userId: string): Promise<void> {
    await db.delete(guildAdmins)
      .where(and(
        eq(guildAdmins.guildId, guildId),
        eq(guildAdmins.userId, userId)
      ));
  }

  async isGuildAdmin(guildId: string, discordUserId: string): Promise<boolean> {
    const [admin] = await db.select().from(guildAdmins)
      .where(and(
        eq(guildAdmins.guildId, guildId),
        eq(guildAdmins.discordUserId, discordUserId)
      ));
    
    return !!admin;
  }

  async getGuildAdmins(guildId: string): Promise<GuildAdmin[]> {
    return await db.select().from(guildAdmins)
      .where(eq(guildAdmins.guildId, guildId));
  }

  // Auction methods
  async createAuction(auction: InsertAuction): Promise<Auction> {
    const [result] = await db.insert(auctions).values(auction).returning();
    return result;
  }

  async getAuctionById(id: string): Promise<Auction | undefined> {
    const [auction] = await db.select().from(auctions).where(eq(auctions.id, id));
    return auction || undefined;
  }

  async getAuctionsByGuild(guildId: string, options?: { status?: string }): Promise<Auction[]> {
    const conditions = [eq(auctions.guildId, guildId)];
    
    if (options?.status) {
      conditions.push(eq(auctions.status, options.status as any));
    }

    return await db.select().from(auctions)
      .where(and(...conditions))
      .orderBy(desc(auctions.createdAt));
  }

  async getAllLiveAuctions(): Promise<Auction[]> {
    return await db.select().from(auctions).where(eq(auctions.status, 'live'));
  }

  async updateAuctionStatus(auctionId: string, status: 'scheduled' | 'live' | 'ended' | 'canceled'): Promise<void> {
    await db.update(auctions).set({ status }).where(eq(auctions.id, auctionId));
  }

  async extendAuction(auctionId: string, newEndTime: Date): Promise<void> {
    await db.update(auctions).set({ endsAt: newEndTime }).where(eq(auctions.id, auctionId));
  }

  // Auction bids and escrow methods
  async placeBid(guildId: string, auctionId: string, userId: string, amount: number): Promise<AuctionBid> {
    const [bid] = await db.insert(auctionBids).values({
      guildId,
      auctionId,
      bidderUserId: userId,
      amount: amount.toString()
    }).returning();
    return bid;
  }

  async placeBidWithEscrow(guildId: string, auctionId: string, userId: string, amount: number): Promise<AuctionBid> {
    return await db.transaction(async (tx) => {
      // Get account
      const [account] = await tx.select().from(accounts)
        .where(and(eq(accounts.guildId, guildId), eq(accounts.userId, userId)));

      if (!account) {
        throw new Error('계좌를 찾을 수 없습니다');
      }

      if (Number(account.balance) - amount < 1) {
        throw new Error('잔액이 부족합니다');
      }

      // Release previous escrow for this user in this auction
      const [previousEscrow] = await tx.select().from(escrows)
        .where(and(
          eq(escrows.guildId, guildId),
          eq(escrows.auctionId, auctionId),
          eq(escrows.userId, userId),
          eq(escrows.status, 'held')
        ));

      if (previousEscrow) {
        // Release previous escrow
        await tx.update(accounts)
          .set({ balance: sql`${accounts.balance} + ${Number(previousEscrow.amount)}` })
          .where(eq(accounts.id, account.id));

        await tx.update(escrows)
          .set({ status: 'released' })
          .where(eq(escrows.id, previousEscrow.id));
      }

      // Hold new amount
      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance} - ${amount}` })
        .where(eq(accounts.id, account.id));

      // Create new escrow
      await tx.insert(escrows).values({
        guildId,
        userId,
        auctionId,
        amount: amount.toString(),
        status: 'held'
      });

      // Place bid
      const [bid] = await tx.insert(auctionBids).values({
        guildId,
        auctionId,
        bidderUserId: userId,
        amount: amount.toString()
      }).returning();

      return bid;
    });
  }

  async getTopBid(auctionId: string): Promise<AuctionBid | undefined> {
    const [bid] = await db.select().from(auctionBids)
      .where(eq(auctionBids.auctionId, auctionId))
      .orderBy(desc(auctionBids.amount))
      .limit(1);
    return bid || undefined;
  }

  async releaseEscrow(escrowId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [escrow] = await tx.select().from(escrows).where(eq(escrows.id, escrowId));
      if (!escrow || escrow.status !== 'held') return;

      const [account] = await tx.select().from(accounts)
        .where(and(eq(accounts.guildId, escrow.guildId), eq(accounts.userId, escrow.userId)));

      if (account) {
        await tx.update(accounts)
          .set({ balance: sql`${accounts.balance} + ${Number(escrow.amount)}` })
          .where(eq(accounts.id, account.id));
      }

      await tx.update(escrows).set({ status: 'released' }).where(eq(escrows.id, escrowId));
    });
  }

  async releaseAllEscrows(auctionId: string): Promise<void> {
    const escrowList = await db.select().from(escrows)
      .where(and(eq(escrows.auctionId, auctionId), eq(escrows.status, 'held')));

    for (const escrow of escrowList) {
      await this.releaseEscrow(escrow.id);
    }
  }

  async captureEscrow(escrowId: string): Promise<void> {
    await db.update(escrows).set({ status: 'captured' }).where(eq(escrows.id, escrowId));
  }

  async settleAuction(auctionId: string, winnerId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Capture winner's escrow
      const [winnerEscrow] = await tx.select().from(escrows)
        .where(and(
          eq(escrows.auctionId, auctionId),
          eq(escrows.userId, winnerId),
          eq(escrows.status, 'held')
        ));

      if (winnerEscrow) {
        await tx.update(escrows).set({ status: 'captured' }).where(eq(escrows.id, winnerEscrow.id));
      }

      // Release all other escrows
      const otherEscrows = await tx.select().from(escrows)
        .where(and(
          eq(escrows.auctionId, auctionId),
          eq(escrows.status, 'held')
        ));

      for (const escrow of otherEscrows) {
        if (escrow.userId !== winnerId) {
          const [account] = await tx.select().from(accounts)
            .where(and(eq(accounts.guildId, escrow.guildId), eq(accounts.userId, escrow.userId)));

          if (account) {
            await tx.update(accounts)
              .set({ balance: sql`${accounts.balance} + ${Number(escrow.amount)}` })
              .where(eq(accounts.id, account.id));
          }

          await tx.update(escrows).set({ status: 'released' }).where(eq(escrows.id, escrow.id));
        }
      }
    });
  }

  // Auction password methods
  async createAuctionPassword(insertPassword: InsertAuctionPassword): Promise<AuctionPassword> {
    const [password] = await db.insert(auctionPasswords).values(insertPassword).returning();
    return password;
  }

  async getAuctionPassword(guildId: string, password: string): Promise<AuctionPassword | undefined> {
    const [result] = await db.select().from(auctionPasswords)
      .where(and(
        eq(auctionPasswords.guildId, guildId),
        eq(auctionPasswords.password, password),
        eq(auctionPasswords.used, false),
        gt(auctionPasswords.expiresAt, new Date())
      ));
    return result || undefined;
  }

  async markAuctionPasswordAsUsed(id: string): Promise<void> {
    await db.update(auctionPasswords)
      .set({ used: true })
      .where(eq(auctionPasswords.id, id));
  }

  async cleanupExpiredAuctionPasswords(): Promise<void> {
    await db.delete(auctionPasswords)
      .where(or(
        eq(auctionPasswords.used, true),
        lt(auctionPasswords.expiresAt, new Date())
      ));
  }

  // Audit log methods
  async addAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [result] = await db.insert(auditLogs).values(log).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
