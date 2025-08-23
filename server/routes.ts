import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertGuildSettingsSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { TradingEngine } from "./services/trading-engine";
import { AuctionManager } from "./services/auction-manager";
import { TaxScheduler } from "./services/tax-scheduler";
import { NewsAnalyzer } from "./services/news-analyzer";
import { WebSocketManager } from "./services/websocket-manager";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const wsManager = new WebSocketManager(wss);
  
  // Initialize services
  const tradingEngine = new TradingEngine(storage, wsManager);
  const auctionManager = new AuctionManager(storage, wsManager);
  const taxScheduler = new TaxScheduler(storage);
  const newsAnalyzer = new NewsAnalyzer(storage, wsManager);

  // Start services
  tradingEngine.start();
  auctionManager.start();
  taxScheduler.start();

  // Authentication middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No authorization header" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Simple JWT-like validation - in production use proper JWT
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { guildId, password } = req.body;
      
      const settings = await storage.getGuildSettings(guildId);
      if (!settings || !settings.adminPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, settings.adminPassword);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = Buffer.from(JSON.stringify({ guildId, isAdmin: true })).toString('base64');
      res.json({ token, user: { guildId, isAdmin: true } });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Dashboard overview
  app.get("/api/guilds/:guildId/overview", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      
      const [accounts, stocks, auctions, transactions] = await Promise.all([
        storage.getAccountsByGuild(guildId),
        storage.getStocksByGuild(guildId),
        storage.getAuctionsByGuild(guildId, { status: 'live' }),
        storage.getRecentTransactions(guildId, 100)
      ]);

      const totalAssets = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
      const activeTrades = transactions.filter(t => 
        t.type === 'stock_buy' || t.type === 'stock_sell'
      ).length;
      const liveAuctionsCount = auctions.length;
      const taxCollected = transactions
        .filter(t => t.type === 'tax')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      res.json({
        totalAssets,
        activeTrades,
        liveAuctions: liveAuctionsCount,
        taxCollected,
        stocks: stocks.slice(0, 10),
        auctions: auctions.slice(0, 5)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get overview" });
    }
  });

  // Stock routes
  app.get("/api/guilds/:guildId/stocks", async (req, res) => {
    try {
      const { guildId } = req.params;
      const stocks = await storage.getStocksByGuild(guildId);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stocks" });
    }
  });

  app.post("/api/guilds/:guildId/stocks", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const stockData = { ...req.body, guildId };
      const stock = await storage.createStock(stockData);
      wsManager.broadcast('stock_created', stock);
      res.json(stock);
    } catch (error) {
      res.status(500).json({ message: "Failed to create stock" });
    }
  });

  app.patch("/api/stocks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { price, status } = req.body;
      
      const stock = await storage.updateStock(id, { price, status });
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }
      
      wsManager.broadcast('stock_updated', stock);
      res.json(stock);
    } catch (error) {
      res.status(500).json({ message: "Failed to update stock" });
    }
  });

  // Trading routes
  app.post("/api/guilds/:guildId/trades", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { userId, symbol, type, shares, price } = req.body;
      
      const result = await tradingEngine.executeTrade(guildId, userId, symbol, type, shares, Number(price));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Portfolio routes
  app.get("/api/guilds/:guildId/users/:userId/portfolio", requireAuth, async (req, res) => {
    try {
      const { guildId, userId } = req.params;
      const holdings = await storage.getHoldingsByUser(guildId, userId);
      const totalValue = await tradingEngine.calculatePortfolioValue(guildId, userId);
      
      res.json({
        holdings,
        totalValue
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get portfolio" });
    }
  });

  // Auction routes
  app.get("/api/guilds/:guildId/auctions", async (req, res) => {
    try {
      const { guildId } = req.params;
      const { status } = req.query;
      const auctions = await storage.getAuctionsByGuild(guildId, { status: status as string });
      res.json(auctions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get auctions" });
    }
  });

  app.post("/api/guilds/:guildId/auctions", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const auctionData = { ...req.body, guildId };
      const auction = await auctionManager.createAuction(auctionData);
      res.json(auction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auctions/:id/bid", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, amount } = req.body;
      
      const result = await auctionManager.placeBid(id, userId, Number(amount));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Candlestick data route
  app.get("/api/guilds/:guildId/stocks/:symbol/candlestick", async (req, res) => {
    try {
      const { guildId, symbol } = req.params;
      const { timeframe = '1h', limit = 100 } = req.query;
      
      const data = await storage.getCandlestickData(guildId, symbol, timeframe as string, Number(limit));
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get candlestick data" });
    }
  });

  // News analysis routes
  app.post("/api/guilds/:guildId/news/analyze", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { title, content, symbol } = req.body;
      
      const analysis = await newsAnalyzer.analyzeNews(guildId, title, content, symbol);
      res.json(analysis);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Transaction history
  app.get("/api/guilds/:guildId/transactions", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { userId, type, limit = 50 } = req.query;
      
      const transactions = await storage.getTransactionHistory(guildId, {
        userId: userId as string,
        type: type as string,
        limit: Number(limit)
      });
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  // Settings routes
  app.get("/api/guilds/:guildId/settings", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const settings = await storage.getGuildSettings(guildId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.patch("/api/guilds/:guildId/settings", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const settings = await storage.updateGuildSettings(guildId, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  return httpServer;
}
