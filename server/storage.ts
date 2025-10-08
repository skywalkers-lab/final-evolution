import { 
  users, accounts, transactions, stocks, holdings, stockTransactions, 
  candlestickData, newsAnalyses, auctions, auctionBids, escrows, 
  auditLogs, guildSettings, guildAdmins, auctionPasswords, limitOrders, robloxLinks,
  orderBook, marketDepth, publicAccounts, robloxMapApis,
  type User, type InsertUser, type Account, type InsertAccount,
  type Transaction, type InsertTransaction, type Stock, type InsertStock,
  type Holding, type InsertHolding, type StockTransaction, type InsertStockTransaction,
  type CandlestickData, type InsertCandlestickData, type NewsAnalysis, type InsertNewsAnalysis,
  type Auction, type InsertAuction, type AuctionBid, type InsertAuctionBid,
  type Escrow, type InsertEscrow, type AuditLog, type InsertAuditLog,
  type GuildSettings, type InsertGuildSettings, type GuildAdmin, type InsertGuildAdmin,
  type AuctionPassword, type InsertAuctionPassword, type LimitOrder, type InsertLimitOrder,
  type RobloxLink, type InsertRobloxLink, type OrderBook, type InsertOrderBook,
  type MarketDepth, type InsertMarketDepth, type PublicAccount, type InsertPublicAccount,
  type RobloxMapApi, type InsertRobloxMapApi
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, gt, lt, asc, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: string, updateData: Partial<InsertUser>): Promise<void>;
  getUsersByGuild(guildId: string): Promise<User[]>;

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
  getCombinedTransactionHistory(guildId: string, userId: string, limit?: number): Promise<any[]>;
  getCombinedTransactionHistoryForAdmin(guildId: string, options: { userId?: string; type?: string; limit?: number }): Promise<any[]>;
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
  getHoldingsByStock(guildId: string, symbol: string): Promise<Holding[]>;
  updateHolding(guildId: string, userId: string, symbol: string, shares: number, avgPrice: number): Promise<void>;
  getStockTransactionsByUser(guildId: string, userId: string): Promise<StockTransaction[]>;
  getRecentTradesBySymbol(guildId: string, symbol: string, minutes: number): Promise<StockTransaction[]>;
  getAllTrades(guildId: string): Promise<StockTransaction[]>;
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
  createGuildSettings(settings: InsertGuildSettings): Promise<GuildSettings>;
  updateGuildSettings(guildId: string, updates: Partial<GuildSettings>): Promise<GuildSettings>;
  updateGuildSetting(guildId: string, key: string, value: any): Promise<void>;
  getAllGuilds(): Promise<{ guildId: string }[]>;
  setAdminPassword(guildId: string, password: string): Promise<void>;

  // Guild admin management
  grantGuildAdmin(guildId: string, userId: string, discordUserId: string, grantedBy: string): Promise<GuildAdmin>;
  removeGuildAdmin(guildId: string, userId: string): Promise<void>;
  isGuildAdmin(guildId: string, discordUserId: string): Promise<boolean>;
  getGuildAdmins(guildId: string): Promise<GuildAdmin[]>;
  
  // Additional admin methods needed by Discord bot
  isAdmin(guildId: string, discordUserId: string): Promise<boolean>;
  grantAdminPermission(guildId: string, targetDiscordId: string, grantedBy: string): Promise<void>;
  
  // Account management methods
  updateAccount(accountId: string, updates: Partial<Account>): Promise<Account>;
  getUserById(userId: string): Promise<User | undefined>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(guildId: string, userId: string, limit?: number): Promise<Transaction[]>;
  removeAdminPermission(guildId: string, targetDiscordId: string): Promise<void>;
  setTaxRate(guildId: string, rate: number): Promise<void>;
  hasActiveAccount(guildId: string, discordUserId: string): Promise<boolean>;
  deleteUserAccount(guildId: string, discordUserId: string): Promise<void>;

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
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Limit orders
  createLimitOrder(limitOrder: InsertLimitOrder): Promise<LimitOrder>;
  getLimitOrder(id: string): Promise<LimitOrder | undefined>;
  getUserLimitOrders(guildId: string, userId: string, status?: string): Promise<LimitOrder[]>;
  getLimitOrdersByGuild(guildId: string, status?: string): Promise<LimitOrder[]>;
  cancelLimitOrder(id: string): Promise<void>;
  executeLimitOrder(id: string, executedPrice: number, executedShares: number): Promise<LimitOrder>;
  partialExecuteLimitOrder(id: string, executedPrice: number, executedShares: number): Promise<LimitOrder>;
  checkPendingOrdersForSymbol(guildId: string, symbol: string, currentPrice: number): Promise<LimitOrder[]>;
  expireLimitOrders(): Promise<void>;

  // Roblox account linking
  createRobloxLinkRequest(discordUserId: string, verificationCode: string): Promise<RobloxLink>;
  getRobloxLinkByDiscordId(discordUserId: string): Promise<RobloxLink | undefined>;
  getRobloxLinkByRobloxId(robloxUserId: string): Promise<RobloxLink | undefined>;
  getRobloxLinkByVerificationCode(code: string): Promise<RobloxLink | undefined>;
  verifyRobloxLink(discordUserId: string, robloxUserId: string, robloxUsername: string): Promise<RobloxLink>;
  deleteRobloxLink(discordUserId: string): Promise<void>;
  expireRobloxLinks(): Promise<void>;

  // Order Book (호가창)
  updateOrderBook(guildId: string, symbol: string, side: 'buy' | 'sell', price: number, quantity: number): Promise<void>;
  getOrderBook(guildId: string, symbol: string, depth?: number): Promise<{ bids: Array<{price: number, quantity: number}>, asks: Array<{price: number, quantity: number}> }>;
  clearOrderBookLevel(guildId: string, symbol: string, side: 'buy' | 'sell', price: number): Promise<void>;
  
  // Market Depth
  updateMarketDepth(guildId: string, symbol: string): Promise<void>;
  getMarketDepth(guildId: string, symbol: string): Promise<MarketDepth | undefined>;
  getBestBidAsk(guildId: string, symbol: string): Promise<{ bestBid: number | null, bestAsk: number | null, spread: number | null }>;

  // Public Accounts
  createPublicAccount(account: InsertPublicAccount): Promise<PublicAccount>;
  getPublicAccountByNumber(guildId: string, accountNumber: string): Promise<PublicAccount | undefined>;
  getPublicAccountByName(guildId: string, accountName: string): Promise<PublicAccount | undefined>;
  getPublicAccountsByGuild(guildId: string): Promise<PublicAccount[]>;
  updatePublicAccountBalance(id: string, balance: number): Promise<void>;
  setTreasuryAccount(guildId: string, accountNumber: string): Promise<void>;
  getTreasuryAccount(guildId: string): Promise<PublicAccount | undefined>;

  // Roblox Map APIs
  createMapApi(api: InsertRobloxMapApi): Promise<RobloxMapApi>;
  getMapApiByName(guildId: string, mapName: string): Promise<RobloxMapApi | undefined>;
  getMapApisByGuild(guildId: string): Promise<RobloxMapApi[]>;
  updateMapApiToken(id: string, token: string): Promise<void>;
  updateMapApiEnabled(id: string, enabled: boolean): Promise<void>;
  deleteMapApi(id: string): Promise<void>;
  getMapApiByToken(token: string): Promise<RobloxMapApi | undefined>;
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

  async updateUser(userId: string, updateData: Partial<InsertUser>): Promise<void> {
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }

  // Account methods
  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async getAccountByUser(guildId: string, userId: string): Promise<Account | undefined> {
    const accountsForUser = await db.select().from(accounts)
      .where(and(eq(accounts.guildId, guildId), eq(accounts.userId, userId)));
    
    // 중복 계좌 감지 및 경고
    if (accountsForUser.length > 1) {
      console.warn(`⚠️ 중복 계좌 감지: 사용자 ${userId}가 길드 ${guildId}에서 ${accountsForUser.length}개의 계좌를 가지고 있습니다.`);
      console.warn('계좌 목록:', accountsForUser.map(acc => ({ id: acc.id, uniqueCode: acc.uniqueCode, balance: acc.balance })));
      
      // 잔액이 가장 높은 계좌를 반환 (또는 생성 시간이 가장 늦은 계좌)
      const primaryAccount = accountsForUser.reduce((prev, current) => {
        const prevBalance = Number(prev.balance);
        const currentBalance = Number(current.balance);
        
        if (prevBalance === currentBalance) {
          // 잔액이 같으면 최근에 생성된 계좌 선택
          return new Date(prev.createdAt) > new Date(current.createdAt) ? prev : current;
        }
        
        return prevBalance > currentBalance ? prev : current;
      });
      
      console.warn(`📌 주 계좌로 선택됨: ${primaryAccount.uniqueCode} (잔액: ${primaryAccount.balance})`);
      return primaryAccount;
    }
    
    return accountsForUser[0] || undefined;
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
    await db.transaction(async (tx) => {
      // Delete all related data first (due to foreign keys)
      // 1. Delete all holdings in this guild
      await tx.delete(holdings).where(eq(holdings.guildId, guildId));

      // 2. Delete all transactions in this guild
      await tx.delete(transactions).where(eq(transactions.guildId, guildId));

      // 3. Delete all limit orders in this guild
      await tx.delete(limitOrders).where(eq(limitOrders.guildId, guildId));

      // 4. Delete all auction bids in this guild
      await tx.delete(auctionBids).where(eq(auctionBids.guildId, guildId));

      // 5. Delete all auctions in this guild
      await tx.delete(auctions).where(eq(auctions.guildId, guildId));

      // 6. Delete all news analysis in this guild
      await tx.delete(newsAnalyses).where(eq(newsAnalyses.guildId, guildId));

      // 7. Delete all candlestick data in this guild
      await tx.delete(candlestickData).where(eq(candlestickData.guildId, guildId));

      // 8. Delete all accounts in this guild (last due to foreign key references)
      await tx.delete(accounts).where(eq(accounts.guildId, guildId));
    });
  }

  // Transaction methods
  async addTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [result] = await db.insert(transactions).values(transaction).returning();
    return result;
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

  async getCombinedTransactionHistory(guildId: string, userId: string, limit = 50): Promise<any[]> {
    // Get regular transactions
    const regularTransactions = await db.select({
      id: transactions.id,
      type: sql<string>`'transaction'`.as('source_type'),
      transactionType: transactions.type,
      amount: transactions.amount,
      memo: transactions.memo,
      fromUserId: transactions.fromUserId,
      toUserId: transactions.toUserId,
      actorId: transactions.actorId,
      createdAt: transactions.createdAt,
      symbol: sql<string>`null`.as('symbol'),
      shares: sql<number>`null`.as('shares'),
      price: sql<string>`null`.as('price')
    }).from(transactions)
      .where(and(
        eq(transactions.guildId, guildId),
        or(eq(transactions.fromUserId, userId), eq(transactions.toUserId, userId))
      ))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);

    // Get stock transactions
    const stockTxns = await db.select({
      id: stockTransactions.id,
      type: sql<string>`'stock'`.as('source_type'),
      transactionType: sql<string>`CASE WHEN ${stockTransactions.type} = 'buy' THEN 'stock_buy' ELSE 'stock_sell' END`.as('transactionType'),
      amount: stockTransactions.totalAmount,
      memo: sql<string>`CONCAT(${stockTransactions.symbol}, ' ', ${stockTransactions.shares}, '주 ', CASE WHEN ${stockTransactions.type} = 'buy' THEN '매수' ELSE '매도' END)`.as('memo'),
      fromUserId: sql<string>`null`.as('fromUserId'),
      toUserId: stockTransactions.userId,
      actorId: stockTransactions.userId,
      createdAt: stockTransactions.createdAt,
      symbol: stockTransactions.symbol,
      shares: stockTransactions.shares,
      price: stockTransactions.price
    }).from(stockTransactions)
      .where(and(
        eq(stockTransactions.guildId, guildId),
        eq(stockTransactions.userId, userId)
      ))
      .orderBy(desc(stockTransactions.createdAt))
      .limit(limit);

    // Combine and sort by date
    const combined = [...regularTransactions, ...stockTxns];
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return combined.slice(0, limit);
  }

  async getCombinedTransactionHistoryForAdmin(guildId: string, options: { userId?: string; type?: string; limit?: number }): Promise<any[]> {
    const limit = options.limit || 50;
    
    // Build conditions for regular transactions
    const regConditions = [eq(transactions.guildId, guildId)];
    if (options.userId) {
      regConditions.push(or(
        eq(transactions.fromUserId, options.userId),
        eq(transactions.toUserId, options.userId)
      )!);
    }
    if (options.type && !options.type.startsWith('stock_')) {
      regConditions.push(eq(transactions.type, options.type as any));
    }

    // Get regular transactions (exclude if filtering for stock types)
    let regularTransactions: any[] = [];
    if (!options.type || !options.type.startsWith('stock_')) {
      regularTransactions = await db.select({
        id: transactions.id,
        type: sql<string>`'transaction'`.as('source_type'),
        transactionType: transactions.type,
        amount: transactions.amount,
        memo: transactions.memo,
        fromUserId: transactions.fromUserId,
        toUserId: transactions.toUserId,
        actorId: transactions.actorId,
        createdAt: transactions.createdAt,
        symbol: sql<string>`null`.as('symbol'),
        shares: sql<number>`null`.as('shares'),
        price: sql<string>`null`.as('price')
      }).from(transactions)
        .where(and(...regConditions))
        .orderBy(desc(transactions.createdAt))
        .limit(limit);
    }

    // Build conditions for stock transactions
    const stockConditions = [eq(stockTransactions.guildId, guildId)];
    if (options.userId) {
      stockConditions.push(eq(stockTransactions.userId, options.userId));
    }
    if (options.type === 'stock_buy') {
      stockConditions.push(eq(stockTransactions.type, 'buy'));
    } else if (options.type === 'stock_sell') {
      stockConditions.push(eq(stockTransactions.type, 'sell'));
    }

    // Get stock transactions (exclude if filtering for non-stock types)
    let stockTxns: any[] = [];
    if (!options.type || options.type.startsWith('stock_') || options.type === 'stock_buy' || options.type === 'stock_sell') {
      stockTxns = await db.select({
        id: stockTransactions.id,
        type: sql<string>`'stock'`.as('source_type'),
        transactionType: sql<string>`CASE WHEN ${stockTransactions.type} = 'buy' THEN 'stock_buy' ELSE 'stock_sell' END`.as('transactionType'),
        amount: stockTransactions.totalAmount,
        memo: sql<string>`CONCAT(${stockTransactions.symbol}, ' ', ${stockTransactions.shares}, '주 ', CASE WHEN ${stockTransactions.type} = 'buy' THEN '매수' ELSE '매도' END)`.as('memo'),
        fromUserId: sql<string>`null`.as('fromUserId'),
        toUserId: stockTransactions.userId,
        actorId: stockTransactions.userId,
        createdAt: stockTransactions.createdAt,
        symbol: stockTransactions.symbol,
        shares: stockTransactions.shares,
        price: stockTransactions.price
      }).from(stockTransactions)
        .where(and(...stockConditions))
        .orderBy(desc(stockTransactions.createdAt))
        .limit(limit);
    }

    // Combine and sort by date
    const combined = [...regularTransactions, ...stockTxns];
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return combined.slice(0, limit);
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

  async getHoldingsByStock(guildId: string, symbol: string): Promise<Holding[]> {
    return await db.select().from(holdings)
      .where(and(eq(holdings.guildId, guildId), eq(holdings.symbol, symbol)));
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

  async getRecentTradesBySymbol(guildId: string, symbol: string, minutes: number): Promise<StockTransaction[]> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return await db.select().from(stockTransactions)
      .where(and(
        eq(stockTransactions.guildId, guildId), 
        eq(stockTransactions.symbol, symbol),
        gte(stockTransactions.createdAt, cutoffTime)
      ))
      .orderBy(desc(stockTransactions.createdAt));
  }

  async getAllTrades(guildId: string): Promise<StockTransaction[]> {
    return await db.select().from(stockTransactions)
      .where(eq(stockTransactions.guildId, guildId))
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

  async getNewsAnalysesByGuild(guildId: string, options?: { limit?: number }): Promise<NewsAnalysis[]> {
    const limit = options?.limit || 50;
    return await db.select().from(newsAnalyses)
      .where(eq(newsAnalyses.guildId, guildId))
      .orderBy(desc(newsAnalyses.createdAt))
      .limit(limit);
  }

  async analyzeNews(guildId: string, title: string, content: string, symbol?: string, createdBy?: string): Promise<NewsAnalysis> {
    // 실제 뉴스 감정 분석 구현
    const sentiment = this.analyzeSentiment(title, content);
    const sentimentScore = this.calculateSentimentScore(title, content);
    
    let priceImpact = "0";
    let actualSymbol = symbol;
    
    // 종목 코드가 없으면 자동 감지
    if (!symbol) {
      actualSymbol = this.detectSymbolFromContent(title, content);
    }
    
    // 가격 영향도 계산 (실제 주가에 반영)
    if (actualSymbol) {
      priceImpact = this.calculatePriceImpact(sentiment, sentimentScore, actualSymbol);
      
      // 실제 주가에 영향 적용 (비동기로 처리)
      setTimeout(async () => {
        try {
          await this.applyNewsImpactToStock(guildId, actualSymbol!, parseFloat(priceImpact), title);
        } catch (error) {
          console.error(`뉴스 영향 적용 실패: ${error}`);
        }
      }, 1000); // 1초 후 적용
    }
    
    const analysis = await this.addNewsAnalysis({
      guildId,
      symbol: actualSymbol,
      title,
      content,
      sentiment,
      sentimentScore: sentimentScore.toString(),
      priceImpact,
      createdBy: createdBy && createdBy !== 'web-dashboard' && createdBy !== 'discord-bot' ? createdBy : null
    });
    
    return analysis;
  }

  // 감정 분석 (한국어 키워드 기반) - 대폭 확장된 키워드 학습
  private analyzeSentiment(title: string, content: string): 'positive' | 'negative' | 'neutral' {
    const text = (title + ' ' + content).toLowerCase();
    
    // 강력한 긍정적 키워드 (높은 가중치)
    const strongPositiveWords = [
      '급등', '급상승', '최고가', '신고가', '신기록', '역대급', '대박', '폭등', '강력한상승', 
      '돌파성공', '목표달성', '수익극대화', '최대이익', '완전승리', '대성공', '핵심성과',
      '혁신적', '획기적', '파격적', '전례없는', '기록적', '놀라운', '대단한', '엄청난'
    ];
    
    // 일반 긍정적 키워드
    const positiveWords = [
      '호조', '상승', '증가', '성장', '개선', '좋은', '성공', '승리', '이익', '흑자', '수익',
      '활성화', '상승세', '돌파', '강세', '최적', '완벽', '우수', '최상', '발전', '확대',
      '신규', '증대', '향상', '도약', '플러스', '긍정', '호재', '랠리', '회복', '반등',
      '호황', '번영', '풍년', '대풍', '풍족', '풍성', '활발', '활기', '생동', '역동',
      '도약', '비상', '전진', '진보', '발달', '성숙', '완성', '달성', '실현', '성취',
      '우위', '선도', '주도', '리드', '앞서', '1위', '선두', '최선', '최고', '최상',
      '효과적', '효율적', '생산적', '건전', '건실', '튼튼', '견고', '안정적', '신뢰',
      '기대', '희망', '낙관', '밝음', '유망', '전망좋음', '가능성', '잠재력', '기회',
      '투자', '매수', '보유', '축적', '저장', '비축', '확보', '유지', '지속', '계속',
      '혜택', '특전', '우대', '지원', '도움', '협력', '제휴', '파트너십', '동반성장'
    ];
    
    // 강력한 부정적 키워드 (높은 가중치)
    const strongNegativeWords = [
      '급락', '폭락', '대폭하락', '최저가', '신저가', '바닥', '붕괴', '파산', '도산', '부도',
      '위기', '재앙', '참사', '대참사', '치명적', '파멸', '파괴', '절망', '암담', '최악',
      '전멸', '몰락', '멸망', '끝', '종료', '중단', '정지', '마비', '불가능', '실패',
      '손실막대', '적자폭대', '파격하락', '충격적', '경악', '당황', '공포', '패닉'
    ];
    
    // 일반 부정적 키워드
    const negativeWords = [
      '부진', '하락', '감소', '악화', '나쁜', '실패', '패배', '손실', '적자', '침체',
      '하락세', '약세', '불완전', '손해', '마이너스', '부실', '하향', '감축', '축소',
      '부정', '악재', '타격', '충격', '피해', '위험', '불안', '우려', '걱정', '근심',
      '어려움', '곤란', '문제', '장애', '제약', '한계', '제한', '저해', '방해', '지연',
      '둔화', '정체', '멈춤', '중단', '취소', '포기', '철회', '철수', '탈퇴', '이탈',
      '약화', '위축', '수축', '축소', '줄어듬', '떨어짐', '내려감', '밀림', '뒤처짐',
      '낙후', '뒤떨어짐', '열세', '불리', '손실', '비용', '부담', '압박', '스트레스',
      '혼란', '복잡', '어수선', '불안정', '불확실', '모호', '애매', '불분명', '의심',
      '반대', '거부', '거절', '배척', '무시', '외면', '소홀', '방치', '버림', '포기',
      '예상밑돌아', '목표미달', '기대이하', '실망', '좌절', '낙담', '포기', '체념'
    ];
    
    // 경제/금융 전문 긍정 키워드
    const financialPositiveWords = [
      'ipo', '상장', '분할', '배당', '보너스', '인센티브', '리워드', '환급', '할인', '혜택',
      'roi증가', '수익률상승', '매출증가', '순이익증가', 'ebitda개선', '현금흐름개선',
      '자본확충', '유동성개선', '신용등급상승', '투자등급', '우량주', '성장주', '가치주',
      '시장점유율증가', '경쟁력강화', '브랜드가치상승', '고객만족도향상', '직원만족도향상',
      '혁신', '신기술', '특허', '독점', '신제품', '신서비스', '시장개척', '해외진출'
    ];
    
    // 경제/금융 전문 부정 키워드
    const financialNegativeWords = [
      '상장폐지', '거래정지', '관리종목', '투자주의', '투자경고', '불성실공시', '감리',
      'roi감소', '수익률하락', '매출감소', '순손실', 'ebitda악화', '현금흐름악화',
      '자본잠식', '유동성위기', '신용등급하락', '투기등급', '정크본드', '부실채권',
      '시장점유율감소', '경쟁력약화', '브랜드가치하락', '고객불만', '직원불만',
      '리콜', '결함', '하자', '소송', '분쟁', '갈등', '대립', '반발', '저항', '보이콧'
    ];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    // 강력한 긍정 키워드 (3점)
    strongPositiveWords.forEach(word => {
      const matches = (text.match(new RegExp(word, 'g')) || []).length;
      positiveScore += matches * 3;
    });
    
    // 일반 긍정 키워드 (1점)
    [...positiveWords, ...financialPositiveWords].forEach(word => {
      const matches = (text.match(new RegExp(word, 'g')) || []).length;
      positiveScore += matches * 1;
    });
    
    // 강력한 부정 키워드 (3점)
    strongNegativeWords.forEach(word => {
      const matches = (text.match(new RegExp(word, 'g')) || []).length;
      negativeScore += matches * 3;
    });
    
    // 일반 부정 키워드 (1점)
    [...negativeWords, ...financialNegativeWords].forEach(word => {
      const matches = (text.match(new RegExp(word, 'g')) || []).length;
      negativeScore += matches * 1;
    });
    
    // 점수 차이가 2점 이상이면 해당 감정, 아니면 중립
    if (positiveScore - negativeScore >= 2) return 'positive';
    if (negativeScore - positiveScore >= 2) return 'negative';
    return 'neutral';
  }
  
  // 감정 점수 계산 (-1 ~ 1) - 대폭 확장된 키워드로 정교한 분석
  private calculateSentimentScore(title: string, content: string): number {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    
    let score = 0;
    const titleWeight = 3; // 제목의 가중치를 더 높게
    const contentWeight = 1;
    
    // 초강력 긍정 키워드 (0.5점)
    const ultraPositive = [
      '급등', '폭등', '신고가', '역대급', '대박', '최고가갱신', '돌파성공', '목표달성',
      '수익극대화', '대성공', '혁신적성과', '획기적발전', '전례없는성장'
    ];
    ultraPositive.forEach(word => {
      const titleMatches = (titleLower.match(new RegExp(word, 'g')) || []).length;
      const contentMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score += (titleMatches * titleWeight * 0.5) + (contentMatches * contentWeight * 0.5);
    });
    
    // 강력한 긍정 키워드 (0.3점)
    const strongPositive = [
      '최고', '신기록', '흑자', '성공', '활성화', '돌파', '도약', '호재', '호황', '번영',
      '급상승', '강력한상승', '완전승리', '핵심성과', '놀라운', '대단한', '엄청난',
      '투자증가', 'roi증가', '매출증가', '순이익증가', '시장점유율증가', '경쟁력강화'
    ];
    strongPositive.forEach(word => {
      const titleMatches = (titleLower.match(new RegExp(word, 'g')) || []).length;
      const contentMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score += (titleMatches * titleWeight * 0.3) + (contentMatches * contentWeight * 0.3);
    });
    
    // 일반 긍정 키워드 (0.15점)
    const positive = [
      '호조', '상승', '증가', '개선', '좋은', '이익', '상승세', '강세', '향상', '수익',
      '회복', '반등', '풍성', '활발', '활기', '전진', '진보', '발달', '성숙', '달성',
      '우위', '선도', '효과적', '효율적', '건실', '튼튼', '안정적', '신뢰', '기대',
      '희망', '낙관', '밝음', '유망', '투자', '매수', '혜택', '지원', 'ipo', '상장',
      '배당', '보너스', '할인', '신기술', '특허', '독점', '신제품', '혁신'
    ];
    positive.forEach(word => {
      const titleMatches = (titleLower.match(new RegExp(word, 'g')) || []).length;
      const contentMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score += (titleMatches * titleWeight * 0.15) + (contentMatches * contentWeight * 0.15);
    });
    
    // 초강력 부정 키워드 (-0.5점)
    const ultraNegative = [
      '급락', '폭락', '대폭하락', '신저가', '바닥', '붕괴', '파산', '도산', '부도',
      '위기', '재앙', '참사', '치명적', '파멸', '절망', '최악', '전멸', '몰락', '끝'
    ];
    ultraNegative.forEach(word => {
      const titleMatches = (titleLower.match(new RegExp(word, 'g')) || []).length;
      const contentMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score -= (titleMatches * titleWeight * 0.5) + (contentMatches * contentWeight * 0.5);
    });
    
    // 강력한 부정 키워드 (-0.3점)
    const strongNegative = [
      '최저', '적자', '실패', '약세', '악재', '타격', '충격', '피해', '위험', '불안',
      '어려움', '문제', '장애', '제약', '손실막대', '적자폭대', '충격적', '경악', '공포',
      '상장폐지', '거래정지', '관리종목', '투자주의', '수익률하락', '매출감소', '순손실'
    ];
    strongNegative.forEach(word => {
      const titleMatches = (titleLower.match(new RegExp(word, 'g')) || []).length;
      const contentMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score -= (titleMatches * titleWeight * 0.3) + (contentMatches * contentWeight * 0.3);
    });
    
    // 일반 부정 키워드 (-0.15점)
    const negative = [
      '부진', '하락', '감소', '악화', '나쁜', '손실', '침체', '하락세', '손해', '우려',
      '걱정', '곤란', '지연', '둔화', '정체', '중단', '취소', '포기', '철회', '약화',
      '위축', '축소', '떨어짐', '밀림', '뒤처짐', '불리', '부담', '압박', '혼란',
      '불안정', '불확실', '반대', '거부', '실망', '좌절', '리콜', '결함', '소송'
    ];
    negative.forEach(word => {
      const titleMatches = (titleLower.match(new RegExp(word, 'g')) || []).length;
      const contentMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score -= (titleMatches * titleWeight * 0.15) + (contentMatches * contentWeight * 0.15);
    });
    
    // -1 ~ 1 범위로 정규화
    return Math.max(-1, Math.min(1, score));
  }
  
  // 종목 자동 감지 - 대폭 확장된 매핑
  private detectSymbolFromContent(title: string, content: string): string | undefined {
    const text = (title + ' ' + content).toLowerCase();
    
    // 종목 코드 직접 언급 감지
    const symbolPatterns = ['bok', 'krbne', 'gsg', 'gold', 'btc'];
    for (const symbol of symbolPatterns) {
      if (text.includes(symbol)) {
        return symbol.toUpperCase();
      }
    }
    
    // 대폭 확장된 회사명/키워드 기반 종목 매핑
    const companyMappings: { [key: string]: string } = {
      // 한국은행 관련
      '한국은행': 'BOK', '중앙은행': 'BOK', '기준금리': 'BOK', '통화정책': 'BOK', 
      '금융통화위원회': 'BOK', '금통위': 'BOK', '이창용': 'BOK', '총재': 'BOK',
      '원화': 'BOK', '환율': 'BOK', '인플레이션': 'BOK', '물가': 'BOK',
      
      // 코리아네이션 관련
      '코리아네이션': 'KRBNE', '한국': 'KRBNE', '국가': 'KRBNE', '정부': 'KRBNE',
      '대통령': 'KRBNE', '청와대': 'KRBNE', '국정원': 'KRBNE', '외교부': 'KRBNE',
      '통일부': 'KRBNE', '국방부': 'KRBNE', 'korea': 'KRBNE', 'korean': 'KRBNE',
      
      // GSG 관련  
      'gsg': 'GSG', '글로벌': 'GSG', '해외': 'GSG', '국제': 'GSG', '수출': 'GSG',
      '무역': 'GSG', '외국인투자': 'GSG', '다국적': 'GSG', '해외진출': 'GSG',
      '글로벌기업': 'GSG', '국제기업': 'GSG', '세계시장': 'GSG',
      
      // 금 관련
      '금': 'GOLD', '골드': 'GOLD', '귀금속': 'GOLD', '금값': 'GOLD', '금시세': 'GOLD',
      '금거래': 'GOLD', '금투자': 'GOLD', '금괴': 'GOLD', '금고': 'GOLD', '안전자산': 'GOLD',
      'gold': 'GOLD', '24k': 'GOLD', '18k': 'GOLD', '순금': 'GOLD', '금채굴': 'GOLD',
      '금광': 'GOLD', '금제품': 'GOLD', '금반지': 'GOLD', '금목걸이': 'GOLD',
      
      // 비트코인 관련
      '비트코인': 'BTC', '비트': 'BTC', '암호화폐': 'BTC', '가상화폐': 'BTC', 
      '디지털자산': 'BTC', '블록체인': 'BTC', '채굴': 'BTC', '마이닝': 'BTC',
      'bitcoin': 'BTC', 'btc': 'BTC', 'crypto': 'BTC', '사토시': 'BTC',
      '지갑': 'BTC', '거래소': 'BTC', '업비트': 'BTC', '빗썸': 'BTC', '코인원': 'BTC',
      '코인베이스': 'BTC', '바이낸스': 'BTC', '가상자산': 'BTC', '디파이': 'BTC',
      'nft': 'BTC', '메타버스': 'BTC', 'web3': 'BTC', '스테이킹': 'BTC'
    };
    
    // 키워드 우선순위 매핑 (더 구체적인 키워드가 우선)
    const sortedMappings = Object.entries(companyMappings).sort((a, b) => b[0].length - a[0].length);
    
    for (const [keyword, symbol] of sortedMappings) {
      if (text.includes(keyword)) {
        return symbol;
      }
    }
    
    // 경제 섹터별 추가 매핑
    const sectorMappings: { [key: string]: string } = {
      // 금융/은행 → BOK
      '은행': 'BOK', '금융': 'BOK', '대출': 'BOK', '예금': 'BOK', '적금': 'BOK',
      '신용': 'BOK', '금리': 'BOK', '이자': 'BOK', '투자': 'BOK', '증권': 'BOK',
      
      // IT/기술 → GSG (글로벌 기술 기업)
      '기술': 'GSG', '혁신': 'GSG', 'ai': 'GSG', '인공지능': 'GSG', '소프트웨어': 'GSG',
      '클라우드': 'GSG', '빅데이터': 'GSG', 'iot': 'GSG', '5g': 'GSG', '반도체': 'GSG',
      
      // 원자재/commodities → GOLD
      '원자재': 'GOLD', '상품': 'GOLD', '석유': 'GOLD', '구리': 'GOLD', '은': 'GOLD',
      '백금': 'GOLD', '팔라듐': 'GOLD', '철': 'GOLD', '알루미늄': 'GOLD', '곡물': 'GOLD'
    };
    
    for (const [keyword, symbol] of Object.entries(sectorMappings)) {
      if (text.includes(keyword)) {
        return symbol;
      }
    }
    
    return undefined;
  }
  
  // 가격 영향도 계산
  private calculatePriceImpact(sentiment: string, sentimentScore: number, symbol: string): string {
    let impact = Math.abs(sentimentScore);
    
    // 종목별 민감도 조정
    const sensitivity: { [key: string]: number } = {
      'BTC': 2.0,    // 비트코인은 변동성이 크다
      'BOK': 0.5,    // 한국은행은 안정적
      'KRBNE': 1.0,  // 기본
      'GSG': 1.2,    // 약간 변동성
      'GOLD': 0.8    // 금은 비교적 안정
    };
    
    const multiplier = sensitivity[symbol] || 1.0;
    impact *= multiplier;
    
    // 최대 5% 영향으로 제한
    impact = Math.min(0.05, impact);
    
    // 감정에 따라 부호 결정
    if (sentiment === 'negative') {
      impact = -impact;
    } else if (sentiment === 'neutral') {
      impact = impact * 0.2; // 중립적이면 영향 최소화
    }
    
    return impact.toFixed(4);
  }
  
  // 실제 주가에 뉴스 영향 적용
  private async applyNewsImpactToStock(guildId: string, symbol: string, priceImpact: number, newsTitle: string): Promise<void> {
    const stock = await this.getStockBySymbol(guildId, symbol);
    if (!stock) return;
    
    const currentPrice = parseFloat(stock.price);
    const impactAmount = currentPrice * Math.abs(priceImpact);
    const newPrice = currentPrice + (currentPrice * priceImpact);
    
    // 최소 가격 보호 (0 이하로 떨어지지 않도록)
    const finalPrice = Math.max(1, Math.round(newPrice));
    
    await this.updateStockPrice(guildId, symbol, finalPrice);
    
    // 뉴스 영향 로그
    const impactType = priceImpact > 0 ? '긍정적' : '부정적';
    const impactPercent = (priceImpact * 100).toFixed(2);
    console.log(`📰 ${symbol}: ${impactType} 뉴스 영향`);
    console.log(`   제목: ${newsTitle}`);
    console.log(`   가격 변동: ${currentPrice.toLocaleString()}원 → ${finalPrice.toLocaleString()}원 (${impactPercent}%)`);
  }

  // Guild settings methods
  async getGuildSettings(guildId: string): Promise<GuildSettings | undefined> {
    const [settings] = await db.select().from(guildSettings)
      .where(eq(guildSettings.guildId, guildId));
    return settings || undefined;
  }

  async createGuildSettings(settings: InsertGuildSettings): Promise<GuildSettings> {
    const [result] = await db.insert(guildSettings)
      .values(settings)
      .returning();
    return result;
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

  // Account deletion methods
  async deleteUserAccount(guildId: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete related data first (due to foreign keys)
      // 1. Delete holdings
      await tx.delete(holdings).where(
        and(
          eq(holdings.guildId, guildId),
          eq(holdings.userId, userId)
        )
      );

      // 2. Delete transactions
      await tx.delete(transactions).where(
        and(
          eq(transactions.guildId, guildId),
          or(
            eq(transactions.fromUserId, userId),
            eq(transactions.toUserId, userId)
          )
        )
      );

      // 3. Delete limit orders
      await tx.delete(limitOrders).where(
        and(
          eq(limitOrders.guildId, guildId),
          eq(limitOrders.userId, userId)
        )
      );

      // 4. Delete the account itself
      await tx.delete(accounts).where(
        and(
          eq(accounts.guildId, guildId),
          eq(accounts.userId, userId)
        )
      );
    });
  }

  async hasActiveAccount(guildId: string, userId: string): Promise<boolean> {
    const [account] = await db.select().from(accounts)
      .where(and(
        eq(accounts.guildId, guildId),
        eq(accounts.userId, userId)
      ));
    return !!account;
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

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    return await this.addAuditLog(log);
  }

  // Limit order methods
  async createLimitOrder(limitOrder: InsertLimitOrder): Promise<LimitOrder> {
    const [result] = await db.insert(limitOrders).values(limitOrder).returning();
    return result;
  }

  async getLimitOrder(id: string): Promise<LimitOrder | undefined> {
    const [result] = await db.select().from(limitOrders).where(eq(limitOrders.id, id));
    return result || undefined;
  }

  async getUserLimitOrders(guildId: string, userId: string, status?: string): Promise<LimitOrder[]> {
    const conditions = [
      eq(limitOrders.guildId, guildId),
      eq(limitOrders.userId, userId)
    ];
    
    if (status) {
      conditions.push(eq(limitOrders.status, status as any));
    }
    
    return await db.select().from(limitOrders)
      .where(and(...conditions))
      .orderBy(desc(limitOrders.createdAt));
  }

  async getLimitOrdersByGuild(guildId: string, status?: string): Promise<LimitOrder[]> {
    const conditions = [
      eq(limitOrders.guildId, guildId)
    ];
    
    if (status) {
      conditions.push(eq(limitOrders.status, status as any));
    }
    
    return await db.select().from(limitOrders)
      .where(and(...conditions))
      .orderBy(desc(limitOrders.createdAt));
  }

  async cancelLimitOrder(id: string): Promise<void> {
    await db.update(limitOrders)
      .set({ 
        status: 'cancelled',
        executedAt: new Date()
      })
      .where(eq(limitOrders.id, id));
  }

  async executeLimitOrder(id: string, executedPrice: number, executedShares: number): Promise<LimitOrder> {
    const [result] = await db.update(limitOrders)
      .set({ 
        status: 'executed',
        executedAt: new Date(),
        executedPrice: executedPrice.toString(),
        executedShares
      })
      .where(eq(limitOrders.id, id))
      .returning();
    
    return result;
  }

  async partialExecuteLimitOrder(id: string, executedPrice: number, executedShares: number): Promise<LimitOrder> {
    const [result] = await db.update(limitOrders)
      .set({ 
        status: 'pending', // 부분 체결이므로 계속 pending 상태 유지
        executedPrice: executedPrice.toString(),
        executedShares // 누적 체결 수량 업데이트
      })
      .where(eq(limitOrders.id, id))
      .returning();
    
    return result;
  }

  async checkPendingOrdersForSymbol(guildId: string, symbol: string, currentPrice: number): Promise<LimitOrder[]> {
    return await db.select().from(limitOrders)
      .where(and(
        eq(limitOrders.guildId, guildId),
        eq(limitOrders.symbol, symbol),
        eq(limitOrders.status, 'pending'),
        or(
          // Buy orders: execute when current price <= target price
          and(
            eq(limitOrders.type, 'buy'),
            lt(sql`${currentPrice}`, limitOrders.targetPrice)
          ),
          // Sell orders: execute when current price >= target price
          and(
            eq(limitOrders.type, 'sell'),
            gt(sql`${currentPrice}`, limitOrders.targetPrice)
          )
        )
      ));
  }

  async expireLimitOrders(): Promise<void> {
    await db.update(limitOrders)
      .set({ status: 'expired' })
      .where(and(
        eq(limitOrders.status, 'pending'),
        lt(limitOrders.expiresAt, sql`now()`)
      ));
  }

  // Additional admin methods needed by Discord bot
  async isAdmin(guildId: string, discordUserId: string): Promise<boolean> {
    return this.isGuildAdmin(guildId, discordUserId);
  }

  async grantAdminPermission(guildId: string, targetDiscordId: string, grantedBy: string): Promise<void> {
    // First get or create the target user
    let targetUser = await this.getUserByDiscordId(targetDiscordId);
    if (!targetUser) {
      // Create a basic user record if it doesn't exist
      targetUser = await this.createUser({
        discordId: targetDiscordId,
        username: `User-${targetDiscordId.slice(-4)}`,
        discriminator: '0000',
        avatar: null
      });
    }

    await this.grantGuildAdmin(guildId, targetUser.id, targetDiscordId, grantedBy);
  }

  async removeAdminPermission(guildId: string, targetDiscordId: string): Promise<void> {
    const targetUser = await this.getUserByDiscordId(targetDiscordId);
    if (targetUser) {
      await this.removeGuildAdmin(guildId, targetUser.id);
    }
  }

  async setTaxRate(guildId: string, rate: number): Promise<void> {
    await this.updateGuildSetting(guildId, 'taxRate', rate.toString());
  }

  async hasActiveAccountByDiscordId(guildId: string, discordUserId: string): Promise<boolean> {
    const user = await this.getUserByDiscordId(discordUserId);
    if (!user) return false;
    
    const account = await this.getAccountByUser(guildId, user.id);
    return account !== undefined && !account.frozen;
  }

  async deleteUserAccountByDiscordId(guildId: string, discordUserId: string): Promise<void> {
    const user = await this.getUserByDiscordId(discordUserId);
    if (!user) return;
    
    const account = await this.getAccountByUser(guildId, user.id);
    if (!account) return;
    
    // Delete all related data first
    await db.transaction(async (tx) => {
      // Delete transactions
      await tx.delete(transactions).where(
        and(
          eq(transactions.guildId, guildId),
          or(
            eq(transactions.fromUserId, user.id),
            eq(transactions.toUserId, user.id)
          )
        )
      );

      // Delete holdings
      await tx.delete(holdings).where(
        and(
          eq(holdings.guildId, guildId),
          eq(holdings.userId, user.id)
        )
      );

      // Delete stock transactions
      await tx.delete(stockTransactions).where(
        and(
          eq(stockTransactions.guildId, guildId),
          eq(stockTransactions.userId, user.id)
        )
      );

      // Finally delete the account
      await tx.delete(accounts).where(eq(accounts.id, account.id));
    });
  }

  async getUsersByGuild(guildId: string): Promise<User[]> {
    // Get all accounts for this guild, then get their users
    const guildAccounts = await db.select().from(accounts).where(eq(accounts.guildId, guildId));
    const userIds = Array.from(new Set(guildAccounts.map(account => account.userId)));
    
    if (userIds.length === 0) return [];
    
    const usersResult = await db.select().from(users).where(
      or(...userIds.map(id => eq(users.id, id)))
    );
    
    return usersResult;
  }

  // 추가된 메서드들
  async updateAccount(accountId: string, updates: Partial<Account>): Promise<Account> {
    const [updated] = await db.update(accounts)
      .set(updates)
      .where(eq(accounts.id, accountId))
      .returning();
    return updated;
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || undefined;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(transaction).returning();
    return created;
  }

  async getTransactionsByUser(guildId: string, userId: string, limit: number = 50): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(
        and(
          eq(transactions.guildId, guildId),
          or(
            eq(transactions.fromUserId, userId),
            eq(transactions.toUserId, userId)
          )
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  // Roblox account linking methods
  async createRobloxLinkRequest(discordUserId: string, verificationCode: string): Promise<RobloxLink> {
    // Delete any existing pending/expired links for this Discord user
    await db.delete(robloxLinks).where(eq(robloxLinks.discordUserId, discordUserId));

    // Create new link request (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const [link] = await db.insert(robloxLinks).values({
      discordUserId,
      verificationCode,
      status: 'pending',
      expiresAt,
    }).returning();
    
    return link;
  }

  async getRobloxLinkByDiscordId(discordUserId: string): Promise<RobloxLink | undefined> {
    const [link] = await db.select().from(robloxLinks)
      .where(eq(robloxLinks.discordUserId, discordUserId));
    return link || undefined;
  }

  async getRobloxLinkByRobloxId(robloxUserId: string): Promise<RobloxLink | undefined> {
    const [link] = await db.select().from(robloxLinks)
      .where(eq(robloxLinks.robloxUserId, robloxUserId));
    return link || undefined;
  }

  async getRobloxLinkByVerificationCode(code: string): Promise<RobloxLink | undefined> {
    const [link] = await db.select().from(robloxLinks)
      .where(
        and(
          eq(robloxLinks.verificationCode, code),
          eq(robloxLinks.status, 'pending')
        )
      );
    return link || undefined;
  }

  async verifyRobloxLink(discordUserId: string, robloxUserId: string, robloxUsername: string): Promise<RobloxLink> {
    const [updated] = await db.update(robloxLinks)
      .set({
        robloxUserId,
        robloxUsername,
        status: 'verified',
        verifiedAt: new Date(),
      })
      .where(eq(robloxLinks.discordUserId, discordUserId))
      .returning();
    
    return updated;
  }

  async deleteRobloxLink(discordUserId: string): Promise<void> {
    await db.delete(robloxLinks).where(eq(robloxLinks.discordUserId, discordUserId));
  }

  async expireRobloxLinks(): Promise<void> {
    // Expire all pending links that have passed their expiration time
    await db.update(robloxLinks)
      .set({ status: 'expired' })
      .where(
        and(
          eq(robloxLinks.status, 'pending'),
          lt(robloxLinks.expiresAt, new Date())
        )
      );
  }

  // Order Book (호가창) methods
  async updateOrderBook(guildId: string, symbol: string, side: 'buy' | 'sell', price: number, quantity: number): Promise<void> {
    if (quantity <= 0) {
      // Remove order book entry if quantity is 0 or less
      await this.clearOrderBookLevel(guildId, symbol, side, price);
      return;
    }

    // Use ON CONFLICT to update quantity if entry exists, otherwise insert
    await db.insert(orderBook)
      .values({
        guildId,
        symbol,
        side,
        price: price.toFixed(2),
        quantity,
      })
      .onConflictDoUpdate({
        target: [orderBook.guildId, orderBook.symbol, orderBook.side, orderBook.price],
        set: {
          quantity,
          updatedAt: new Date(),
        }
      });
  }

  async getOrderBook(guildId: string, symbol: string, depth: number = 10): Promise<{ 
    bids: Array<{price: number, quantity: number}>, 
    asks: Array<{price: number, quantity: number}> 
  }> {
    // Get buy orders (bids) - highest prices first
    const bidsRaw = await db.select({
      price: orderBook.price,
      quantity: orderBook.quantity,
    })
      .from(orderBook)
      .where(
        and(
          eq(orderBook.guildId, guildId),
          eq(orderBook.symbol, symbol),
          eq(orderBook.side, 'buy')
        )
      )
      .orderBy(desc(orderBook.price))
      .limit(depth);

    // Get sell orders (asks) - lowest prices first
    const asksRaw = await db.select({
      price: orderBook.price,
      quantity: orderBook.quantity,
    })
      .from(orderBook)
      .where(
        and(
          eq(orderBook.guildId, guildId),
          eq(orderBook.symbol, symbol),
          eq(orderBook.side, 'sell')
        )
      )
      .orderBy(asc(orderBook.price))
      .limit(depth);

    // Convert string prices to numbers
    const bids = bidsRaw.map(b => ({ price: Number(b.price), quantity: b.quantity }));
    const asks = asksRaw.map(a => ({ price: Number(a.price), quantity: a.quantity }));

    return { bids, asks };
  }

  async clearOrderBookLevel(guildId: string, symbol: string, side: 'buy' | 'sell', price: number): Promise<void> {
    await db.delete(orderBook)
      .where(
        and(
          eq(orderBook.guildId, guildId),
          eq(orderBook.symbol, symbol),
          eq(orderBook.side, side),
          eq(orderBook.price, price.toFixed(2))
        )
      );
  }

  async updateMarketDepth(guildId: string, symbol: string): Promise<void> {
    const book = await this.getOrderBook(guildId, symbol, 20);
    
    const bidPrices = book.bids.map(b => ({ price: b.price, quantity: b.quantity }));
    const askPrices = book.asks.map(a => ({ price: a.price, quantity: a.quantity }));
    
    const bestBid = bidPrices[0]?.price || null;
    const bestAsk = askPrices[0]?.price || null;
    const spread = (bestBid && bestAsk) ? (bestAsk - bestBid) : null;

    await db.insert(marketDepth)
      .values({
        guildId,
        symbol,
        bidPrices,
        askPrices,
        spread: spread !== null ? spread.toFixed(2) : null,
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: [marketDepth.guildId, marketDepth.symbol],
        set: {
          bidPrices,
          askPrices,
          spread: spread !== null ? spread.toFixed(2) : null,
          lastUpdated: new Date(),
        }
      });
  }

  async getMarketDepth(guildId: string, symbol: string): Promise<MarketDepth | undefined> {
    const [depth] = await db.select()
      .from(marketDepth)
      .where(
        and(
          eq(marketDepth.guildId, guildId),
          eq(marketDepth.symbol, symbol)
        )
      );
    return depth || undefined;
  }

  async getBestBidAsk(guildId: string, symbol: string): Promise<{ 
    bestBid: number | null, 
    bestAsk: number | null, 
    spread: number | null 
  }> {
    const [highestBid] = await db.select()
      .from(orderBook)
      .where(
        and(
          eq(orderBook.guildId, guildId),
          eq(orderBook.symbol, symbol),
          eq(orderBook.side, 'buy')
        )
      )
      .orderBy(desc(orderBook.price))
      .limit(1);

    const [lowestAsk] = await db.select()
      .from(orderBook)
      .where(
        and(
          eq(orderBook.guildId, guildId),
          eq(orderBook.symbol, symbol),
          eq(orderBook.side, 'sell')
        )
      )
      .orderBy(asc(orderBook.price))
      .limit(1);

    const bestBid = highestBid?.price ? Number(highestBid.price) : null;
    const bestAsk = lowestAsk?.price ? Number(lowestAsk.price) : null;
    const spread = (bestBid && bestAsk) ? (bestAsk - bestBid) : null;

    return { bestBid, bestAsk, spread };
  }

  // Public Account methods
  async createPublicAccount(account: InsertPublicAccount): Promise<PublicAccount> {
    const [newAccount] = await db.insert(publicAccounts).values(account).returning();
    return newAccount;
  }

  async getPublicAccountByNumber(guildId: string, accountNumber: string): Promise<PublicAccount | undefined> {
    const [account] = await db.select()
      .from(publicAccounts)
      .where(
        and(
          eq(publicAccounts.guildId, guildId),
          eq(publicAccounts.accountNumber, accountNumber)
        )
      );
    return account || undefined;
  }

  async getPublicAccountByName(guildId: string, accountName: string): Promise<PublicAccount | undefined> {
    const [account] = await db.select()
      .from(publicAccounts)
      .where(
        and(
          eq(publicAccounts.guildId, guildId),
          eq(publicAccounts.accountName, accountName)
        )
      );
    return account || undefined;
  }

  async getPublicAccountsByGuild(guildId: string): Promise<PublicAccount[]> {
    return await db.select()
      .from(publicAccounts)
      .where(eq(publicAccounts.guildId, guildId));
  }

  async updatePublicAccountBalance(id: string, balance: number): Promise<void> {
    await db.update(publicAccounts)
      .set({ balance: balance.toString() })
      .where(eq(publicAccounts.id, id));
  }

  async setTreasuryAccount(guildId: string, accountNumber: string): Promise<void> {
    // 먼저 모든 계좌의 isTreasury를 false로 설정
    await db.update(publicAccounts)
      .set({ isTreasury: false })
      .where(eq(publicAccounts.guildId, guildId));

    // 선택된 계좌를 국고로 설정
    await db.update(publicAccounts)
      .set({ isTreasury: true })
      .where(
        and(
          eq(publicAccounts.guildId, guildId),
          eq(publicAccounts.accountNumber, accountNumber)
        )
      );
  }

  async getTreasuryAccount(guildId: string): Promise<PublicAccount | undefined> {
    const [account] = await db.select()
      .from(publicAccounts)
      .where(
        and(
          eq(publicAccounts.guildId, guildId),
          eq(publicAccounts.isTreasury, true)
        )
      );
    return account || undefined;
  }

  // Roblox Map API methods
  async createMapApi(api: InsertRobloxMapApi): Promise<RobloxMapApi> {
    const [newApi] = await db.insert(robloxMapApis).values(api).returning();
    return newApi;
  }

  async getMapApiByName(guildId: string, mapName: string): Promise<RobloxMapApi | undefined> {
    const [api] = await db.select()
      .from(robloxMapApis)
      .where(
        and(
          eq(robloxMapApis.guildId, guildId),
          eq(robloxMapApis.mapName, mapName)
        )
      );
    return api || undefined;
  }

  async getMapApisByGuild(guildId: string): Promise<RobloxMapApi[]> {
    return await db.select()
      .from(robloxMapApis)
      .where(eq(robloxMapApis.guildId, guildId));
  }

  async updateMapApiToken(id: string, token: string): Promise<void> {
    await db.update(robloxMapApis)
      .set({ token })
      .where(eq(robloxMapApis.id, id));
  }

  async updateMapApiEnabled(id: string, enabled: boolean): Promise<void> {
    await db.update(robloxMapApis)
      .set({ enabled })
      .where(eq(robloxMapApis.id, id));
  }

  async deleteMapApi(id: string): Promise<void> {
    await db.delete(robloxMapApis)
      .where(eq(robloxMapApis.id, id));
  }

  async getMapApiByToken(token: string): Promise<RobloxMapApi | undefined> {
    const [api] = await db.select()
      .from(robloxMapApis)
      .where(eq(robloxMapApis.token, token));
    return api || undefined;
  }
}

export const storage = new DatabaseStorage();
