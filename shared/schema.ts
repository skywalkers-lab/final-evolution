import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const stockStatusEnum = pgEnum('stock_status', ['active', 'halted', 'delisted']);
export const transactionTypeEnum = pgEnum('transaction_type', [
  'initial_deposit', 'transfer_in', 'transfer_out', 'admin_deposit', 'admin_withdraw',
  'admin_issue', 'admin_seize', 'payroll_in', 'payroll_out', 'tax',
  'stock_buy', 'stock_sell', 'auction_hold', 'auction_release', 'auction_capture',
  'admin_freeze', 'admin_unfreeze', 'admin_reset_all', 'stock_price_update',
  'stock_status_change', 'news_adjust'
]);
export const auctionStatusEnum = pgEnum('auction_status', ['scheduled', 'live', 'ended', 'canceled']);
export const auctionItemTypeEnum = pgEnum('auction_item_type', ['text', 'stock']);
export const stockTransactionTypeEnum = pgEnum('stock_transaction_type', ['buy', 'sell']);
export const escrowStatusEnum = pgEnum('escrow_status', ['held', 'released', 'captured']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discordId: varchar("discord_id").unique(),
  username: text("username").notNull(),
  discriminator: text("discriminator"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Guild settings
export const guildSettings = pgTable("guild_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").unique().notNull(),
  adminRoleId: varchar("admin_role_id"),
  employerRoleId: varchar("employer_role_id"),
  currencySymbol: text("currency_symbol").default("₩"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  newsMaxImpactPct: decimal("news_max_impact_pct", { precision: 5, scale: 2 }).default("15"),
  auctionFeePct: decimal("auction_fee_pct", { precision: 5, scale: 2 }).default("0"),
  adminPassword: text("admin_password"),
});

// Accounts
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  uniqueCode: varchar("unique_code").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("1000000"), // Default 1M won
  frozen: boolean("frozen").default(false),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").notNull(),
  actorId: varchar("actor_id").references(() => users.id),
  fromUserId: varchar("from_user_id").references(() => users.id),
  toUserId: varchar("to_user_id").references(() => users.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  memo: text("memo"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Stocks
export const stocks = pgTable("stocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").notNull(),
  symbol: varchar("symbol").notNull(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  totalShares: integer("total_shares").default(1000000),
  status: stockStatusEnum("status").default("active"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Holdings
export const holdings = pgTable("holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  symbol: varchar("symbol").notNull(),
  shares: integer("shares").notNull().default(0),
  avgPrice: decimal("avg_price", { precision: 15, scale: 2 }).notNull(),
});

// Stock transactions
export const stockTransactions = pgTable("stock_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  symbol: varchar("symbol").notNull(),
  type: stockTransactionTypeEnum("type").notNull(),
  shares: integer("shares").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Candlestick data
export const candlestickData = pgTable("candlestick_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").notNull(),
  symbol: varchar("symbol").notNull(),
  timeframe: varchar("timeframe").notNull(), // '1m', '5m', '1h', '1d'
  timestamp: timestamp("timestamp").notNull(),
  open: decimal("open", { precision: 15, scale: 2 }).notNull(),
  high: decimal("high", { precision: 15, scale: 2 }).notNull(),
  low: decimal("low", { precision: 15, scale: 2 }).notNull(),
  close: decimal("close", { precision: 15, scale: 2 }).notNull(),
  volume: integer("volume").default(0),
});

// News analysis
export const newsAnalyses = pgTable("news_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").notNull(),
  symbol: varchar("symbol"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sentiment: text("sentiment"), // 'positive', 'negative', 'neutral'
  sentimentScore: decimal("sentiment_score", { precision: 5, scale: 4 }),
  priceImpact: decimal("price_impact", { precision: 5, scale: 4 }),
  oldPrice: decimal("old_price", { precision: 15, scale: 2 }),
  newPrice: decimal("new_price", { precision: 15, scale: 2 }),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Auctions
export const auctions = pgTable("auctions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").notNull(),
  itemType: auctionItemTypeEnum("item_type").notNull(),
  itemRef: text("item_ref").notNull(), // free text or "SYMBOL:QTY"
  startPrice: decimal("start_price", { precision: 15, scale: 2 }).notNull(),
  buyoutPrice: decimal("buyout_price", { precision: 15, scale: 2 }),
  minIncrementAbs: decimal("min_increment_abs", { precision: 15, scale: 2 }),
  minIncrementPct: decimal("min_increment_pct", { precision: 5, scale: 2 }),
  extendSeconds: integer("extend_seconds"),
  startedAt: timestamp("started_at"),
  endsAt: timestamp("ends_at").notNull(),
  status: auctionStatusEnum("status").default("scheduled"),
  sellerUserId: varchar("seller_user_id").references(() => users.id),
  canceledReason: text("canceled_reason"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Auction bids
export const auctionBids = pgTable("auction_bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").notNull(),
  auctionId: varchar("auction_id").notNull().references(() => auctions.id),
  bidderUserId: varchar("bidder_user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  isWinningSnap: boolean("is_winning_snap").default(false),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Escrow
export const escrows = pgTable("escrows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  auctionId: varchar("auction_id").notNull().references(() => auctions.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: escrowStatusEnum("status").default("held"),
});

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id").notNull(),
  actorId: varchar("actor_id").references(() => users.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  transactions: many(transactions),
  holdings: many(holdings),
  stockTransactions: many(stockTransactions),
  newsAnalyses: many(newsAnalyses),
  auctions: many(auctions),
  auctionBids: many(auctionBids),
  escrows: many(escrows),
  auditLogs: many(auditLogs),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactionsFrom: many(transactions, { relationName: "fromUser" }),
  transactionsTo: many(transactions, { relationName: "toUser" }),
}));

export const stocksRelations = relations(stocks, ({ many }) => ({
  holdings: many(holdings),
  stockTransactions: many(stockTransactions),
  candlestickData: many(candlestickData),
  newsAnalyses: many(newsAnalyses),
}));

export const auctionsRelations = relations(auctions, ({ one, many }) => ({
  seller: one(users, { fields: [auctions.sellerUserId], references: [users.id] }),
  bids: many(auctionBids),
  escrows: many(escrows),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertGuildSettingsSchema = createInsertSchema(guildSettings).omit({ id: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertStockSchema = createInsertSchema(stocks).omit({ id: true, createdAt: true });
export const insertHoldingSchema = createInsertSchema(holdings).omit({ id: true });
export const insertStockTransactionSchema = createInsertSchema(stockTransactions).omit({ id: true, createdAt: true });
export const insertCandlestickDataSchema = createInsertSchema(candlestickData).omit({ id: true });
export const insertNewsAnalysisSchema = createInsertSchema(newsAnalyses).omit({ id: true, createdAt: true });
export const insertAuctionSchema = createInsertSchema(auctions).omit({ id: true, createdAt: true });
export const insertAuctionBidSchema = createInsertSchema(auctionBids).omit({ id: true, createdAt: true });
export const insertEscrowSchema = createInsertSchema(escrows).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type GuildSettings = typeof guildSettings.$inferSelect;
export type InsertGuildSettings = z.infer<typeof insertGuildSettingsSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Stock = typeof stocks.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;
export type Holding = typeof holdings.$inferSelect;
export type InsertHolding = z.infer<typeof insertHoldingSchema>;
export type StockTransaction = typeof stockTransactions.$inferSelect;
export type InsertStockTransaction = z.infer<typeof insertStockTransactionSchema>;
export type CandlestickData = typeof candlestickData.$inferSelect;
export type InsertCandlestickData = z.infer<typeof insertCandlestickDataSchema>;
export type NewsAnalysis = typeof newsAnalyses.$inferSelect;
export type InsertNewsAnalysis = z.infer<typeof insertNewsAnalysisSchema>;
export type Auction = typeof auctions.$inferSelect;
export type InsertAuction = z.infer<typeof insertAuctionSchema>;
export type AuctionBid = typeof auctionBids.$inferSelect;
export type InsertAuctionBid = z.infer<typeof insertAuctionBidSchema>;
export type Escrow = typeof escrows.$inferSelect;
export type InsertEscrow = z.infer<typeof insertEscrowSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
