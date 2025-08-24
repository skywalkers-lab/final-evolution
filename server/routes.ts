import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertGuildSettingsSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import axios from "axios";
import { TradingEngine } from "./services/trading-engine";
import { AuctionManager } from "./services/auction-manager";
import { TaxScheduler } from "./services/tax-scheduler";
import { NewsAnalyzer } from "./services/news-analyzer";
import { WebSocketManager } from "./services/websocket-manager";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import "./types";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server with proper cleanup
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    perMessageDeflate: false, // 성능 개선
    maxPayload: 64 * 1024    // 64KB 제한
  });
  
  const wsManager = new WebSocketManager(wss);

  // WebSocket 서버 정리 함수
  httpServer.on('close', () => {
    console.log('🧹 Cleaning up WebSocket connections...');
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.terminate();
      }
    });
    wss.close(() => {
      console.log('✅ WebSocket server closed');
    });
  });
  
  // Initialize services
  const tradingEngine = new TradingEngine(storage, wsManager);
  const auctionManager = new AuctionManager(storage, wsManager);
  const taxScheduler = new TaxScheduler(storage);
  const newsAnalyzer = new NewsAnalyzer(storage, wsManager);

  // Start services
  tradingEngine.start();
  auctionManager.start();
  taxScheduler.start();

  // Initialize Discord bot with shared WebSocket manager (after routes are set)
  if (process.env.DISCORD_BOT_TOKEN) {
    try {
      const { DiscordBot } = await import("./services/discord-bot");
      const discordBot = new DiscordBot(storage, wsManager, tradingEngine);
      await discordBot.start();
      (global as any).discordBot = discordBot;
      console.log("🎉 Discord bot initialized successfully!");
    } catch (error) {
      console.log(`❌ Failed to initialize Discord bot: ${error}`);
    }
  }

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

  // Discord OAuth routes
  app.get("/auth/discord", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    // Use proper domain for Replit environment
    let domain = process.env.REPLIT_DOMAINS;
    if (domain && domain.includes(',')) {
      // If multiple domains, use the first one
      domain = domain.split(',')[0];
    }
    // Fallback to known deployed domain or construct from env vars
    domain = domain || 'BankofKorea.replit.app' || `${process.env.REPL_SLUG}.${process.env.REPL_OWNER || 'dev'}.replit.app`;
    const redirectUri = `https://${domain}/auth/discord/callback`;
    const scopes = "identify guilds";
    
    console.log('Discord OAuth redirect URI:', redirectUri);
    
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
    
    res.redirect(authUrl);
  });

  app.get("/auth/discord/callback", async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.redirect("/?error=no_code");
      }

      const clientId = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;
      // Use REPLIT_DOMAINS environment variable for correct redirect URI
      let domain = process.env.REPLIT_DOMAINS;
      if (domain && domain.includes(',')) {
        // If multiple domains, use the first one
        domain = domain.split(',')[0];
      }
      // Fallback to known deployed domain or request host
      domain = domain || 'BankofKorea.replit.app' || req.get('host');
      const redirectUri = `https://${domain}/auth/discord/callback`;

      // Exchange code for token
      const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token } = tokenResponse.data;

      // Get user info
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });

      const discordUser = userResponse.data;

      // Create/update user in database
      let user = await storage.getUserByDiscordId(discordUser.id);
      if (!user) {
        user = await storage.createUser({
          discordId: discordUser.id,
          username: discordUser.username,
          discriminator: discordUser.discriminator || '0',
          avatar: discordUser.avatar
        });
      }

      // Store session info
      const sessionToken = Buffer.from(JSON.stringify({
        userId: user.id,
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator || '0',
        avatar: discordUser.avatar,
        accessToken: access_token
      })).toString('base64');

      // Set session cookie and redirect
      const isProduction = req.get('host')?.includes('replit.app') || false;
      console.log('🍪 Setting session cookie:', { 
        isProduction, 
        host: req.get('host'),
        userInfo: { username: discordUser.username, id: user.id }
      });
      
      res.cookie('session_token', sessionToken, { 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        secure: isProduction, // HTTPS only in production
        sameSite: isProduction ? 'lax' : 'lax', // Use lax for both
        path: '/' // Ensure cookie is available for all paths
      });
      
      console.log('✅ OAuth success, redirecting to dashboard');
      res.redirect('/');
    } catch (error) {
      console.error('❌ Discord OAuth error:', error);
      res.redirect('/?error=auth_failed');
    }
  });

  app.get("/api/me", async (req, res) => {
    try {
      const sessionToken = req.cookies.session_token;
      console.log('🔍 Checking session:', { 
        hasToken: !!sessionToken, 
        cookies: Object.keys(req.cookies),
        host: req.get('host')
      });
      
      if (!sessionToken) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
      
      // Check if access token is still valid
      try {
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
          headers: {
            Authorization: `Bearer ${sessionData.accessToken}`
          }
        });
        
        res.json({
          id: sessionData.userId,
          discordId: sessionData.discordId,
          username: sessionData.username,
          discriminator: sessionData.discriminator,
          avatar: sessionData.avatar
        });
      } catch (apiError) {
        res.status(401).json({ message: "Session expired" });
      }
    } catch (error) {
      res.status(401).json({ message: "Invalid session" });
    }
  });

  app.get("/api/guilds", async (req, res) => {
    try {
      const sessionToken = req.cookies.session_token;
      if (!sessionToken) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());

      // Get user's guilds from Discord
      const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${sessionData.accessToken}`
        }
      });

      const userGuilds = guildsResponse.data;
      
      // Filter to only include guilds where bot is present
      const botGuildIds = (global as any).discordBot ? (global as any).discordBot.getBotGuildIds() : [];
      console.log('User guilds:', userGuilds.map((g: any) => ({ id: g.id, name: g.name })));
      console.log('Bot guild IDs:', botGuildIds);
      
      const commonGuilds = userGuilds.filter((guild: any) => botGuildIds.includes(guild.id));
      
      res.json(commonGuilds.map((guild: any) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner,
        permissions: guild.permissions
      })));
    } catch (error) {
      console.error('Error fetching guilds:', error);
      res.status(500).json({ message: "Failed to fetch guilds" });
    }
  });

  // Debug endpoint to check bot guilds
  app.get("/api/debug/bot-guilds", (req, res) => {
    const botGuildIds = (global as any).discordBot ? (global as any).discordBot.getBotGuildIds() : [];
    res.json({
      botGuildIds,
      botConnected: !!(global as any).discordBot,
      clientReady: (global as any).discordBot?.isReady() || false
    });
  });

  // Public object serving for stock logos (no auth required)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // For stock logos, we make them publicly accessible
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/auth/logout", (req, res) => {
    res.clearCookie('session_token');
    res.json({ message: "Logged out successfully" });
  });

  // Get all accounts for a guild (for tax calculations)
  app.get("/api/guilds/:guildId/accounts", async (req, res) => {
    try {
      const { guildId } = req.params;
      const accounts = await storage.getAccountsByGuild(guildId);
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching guild accounts:', error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  // Admin auth routes (guild password)
  app.post("/api/auth/admin-login", async (req, res) => {
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

      // Update session to include admin flag
      const sessionToken = req.cookies.session_token;
      if (sessionToken) {
        const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
        sessionData.adminGuilds = sessionData.adminGuilds || [];
        if (!sessionData.adminGuilds.includes(guildId)) {
          sessionData.adminGuilds.push(guildId);
        }
        
        const newSessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');
        res.cookie('session_token', newSessionToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      }

      res.json({ success: true, message: "Admin access granted" });
    } catch (error) {
      res.status(500).json({ message: "Admin login failed" });
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
  // Web client routes (no auth required) - placed early to avoid conflicts
  app.get("/api/web-client/guilds/:guildId/account", async (req, res) => {
    try {
      const { guildId } = req.params;
      console.log(`Web client account request for guild: ${guildId}`);
      
      // Get all accounts for this guild and use the most recent one (like portfolio logic)
      const accounts = await storage.getAccountsByGuild(guildId);
      console.log(`Found ${accounts.length} accounts for guild ${guildId}:`, accounts.map(acc => ({ 
        id: acc.id, 
        uniqueCode: acc.uniqueCode, 
        balance: acc.balance,
        userId: acc.userId 
      })));
      
      if (accounts.length === 0) {
        console.log('Web client account response: no account found');
        return res.json({ account: null });
      }
      
      // Use the most recently created account (latest user)
      const account = accounts[accounts.length - 1];
      
      console.log('Web client account response:', { balance: account.balance });
      res.json({ account });
    } catch (error) {
      console.error('Web client account error:', error);
      res.status(500).json({ message: "Failed to get web client account" });
    }
  });

  // Web client stocks list
  app.get("/api/web-client/guilds/:guildId/stocks", async (req, res) => {
    try {
      const { guildId } = req.params;
      console.log(`Web client stocks request for guild: ${guildId}`);
      
      const stocks = await storage.getStocksByGuild(guildId);
      res.json(stocks || []);
    } catch (error) {
      console.error('Web client stocks error:', error);
      res.json([]);
    }
  });

  // Web client candlestick data
  app.get("/api/web-client/guilds/:guildId/stocks/:symbol/candlestick/:timeframe", async (req, res) => {
    try {
      const { guildId, symbol, timeframe } = req.params;
      console.log(`Web client candlestick request: ${guildId}/${symbol}/${timeframe}`);
      
      // Get candlestick data from storage
      const candlestickData = await storage.getCandlestickData(guildId, symbol, timeframe, 100);
      res.json(candlestickData || []);
    } catch (error) {
      console.error('Web client candlestick error:', error);
      res.json([]);
    }
  });

  app.get("/api/web-client/guilds/:guildId/portfolio", async (req, res) => {
    try {
      const { guildId } = req.params;
      console.log(`Web client portfolio request for guild: ${guildId}`);
      
      // Get all accounts for this guild to show the most recent one
      const accounts = await storage.getAccountsByGuild(guildId);
      let account = null;
      let user = null;
      
      if (accounts.length > 0) {
        // Use the most recent account (last user to create one)
        account = accounts[accounts.length - 1];
        user = await storage.getUser(account.userId);
      }
      
      // If no accounts exist, return empty portfolio
      if (!account) {
        console.log('Web client portfolio response: no account found, returning empty');
        return res.json({
          holdings: [],
          account: null,
          balance: '0.00',
          totalValue: 0
        });
      }
      
      // Get holdings from database and enrich with current prices
      const holdings = await storage.getHoldingsByUser(guildId, user!.id);
      const enrichedHoldings = [];
      let stocksValue = 0;
      
      for (const holding of holdings || []) {
        const stock = await storage.getStockBySymbol(guildId, holding.symbol);
        const currentPrice = stock ? Number(stock.price) : 0;
        const enrichedHolding = {
          ...holding,
          name: stock?.name || holding.symbol,
          currentPrice,
        };
        enrichedHoldings.push(enrichedHolding);
        stocksValue += holding.shares * currentPrice;
      }
      
      const totalValue = Number(account.balance) + stocksValue;
      
      const portfolio = {
        holdings: enrichedHoldings,
        account: {
          id: account.id,
          balance: account.balance,
          frozen: account.frozen || false,
          uniqueCode: account.uniqueCode
        },
        totalValue
      };
      
      console.log('Web client portfolio response:', { balance: account.balance, totalValue: portfolio.totalValue });
      res.json(portfolio);
    } catch (error) {
      console.error('Web client portfolio error:', error);
      res.status(500).json({ message: "Failed to get web client portfolio" });
    }
  });

  app.get("/api/web-client/guilds/:guildId/transactions", async (req, res) => {
    try {
      const { guildId } = req.params;
      console.log(`Web client transactions request for guild: ${guildId}`);
      
      // Get all accounts for this guild to show the most recent one (same logic as portfolio)
      const accounts = await storage.getAccountsByGuild(guildId);
      let user = null;
      
      if (accounts.length > 0) {
        // Get the most recently created account (latest user) - same as portfolio
        const account = accounts[accounts.length - 1];
        user = await storage.getUser(account.userId);
      }
      
      // If no accounts exist, create a demo web-client account (fallback)
      if (!user) {
        user = await storage.getUserByDiscordId('web-client');
        if (!user) {
          user = await storage.createUser({
            discordId: 'web-client',
            username: 'Web Client',
            discriminator: '0000',
            avatar: null
          });
        }
      }
      
      const transactions = await storage.getTransactionsByUser(guildId, user.id, 20);
      res.json(transactions);
    } catch (error) {
      console.error('Web client transactions error:', error);
      res.json([]); // Return empty array if no transactions
    }
  });

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
      const { symbol } = req.body;
      
      // 중복 체크
      const existingStock = await storage.getStockBySymbol(guildId, symbol.toUpperCase());
      if (existingStock) {
        return res.status(400).json({ message: `종목코드 ${symbol}이 이미 존재합니다.` });
      }
      
      const stockData = { ...req.body, guildId, symbol: symbol.toUpperCase() };
      const stock = await storage.createStock(stockData);
      wsManager.broadcast('stock_created', stock);
      res.json(stock);
    } catch (error) {
      console.error('Stock creation error:', error);
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

  // Limit Order routes
  app.get("/api/guilds/:guildId/limit-orders", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { userId, status } = req.query;
      
      const limitOrders = await storage.getUserLimitOrders(guildId, userId as string, status as string);
      res.json(limitOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get limit orders" });
    }
  });

  app.post("/api/guilds/:guildId/limit-orders", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { symbol, type, shares, targetPrice, expiresAt } = req.body;
      const userId = req.user.id;
      
      const limitOrder = await tradingEngine.createLimitOrder(guildId, userId, symbol, type, shares, Number(targetPrice), expiresAt);
      res.json(limitOrder);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/guilds/:guildId/limit-orders/:orderId", requireAuth, async (req, res) => {
    try {
      const { guildId, orderId } = req.params;
      const userId = req.user.id;
      
      // Security check: Only allow users to cancel their own orders or if they're guild admin
      const limitOrder = await storage.getLimitOrder(orderId);
      if (!limitOrder) {
        return res.status(404).json({ message: "지정가 주문을 찾을 수 없습니다" });
      }
      
      if (limitOrder.userId !== userId) {
        const isAdmin = await storage.isGuildAdmin(guildId, userId);
        if (!isAdmin) {
          return res.status(403).json({ message: "자신의 주문만 취소할 수 있습니다" });
        }
      }
      
      await storage.cancelLimitOrder(orderId);
      res.json({ message: "지정가 주문이 취소되었습니다" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Web client limit orders API
  app.get("/api/web-client/guilds/:guildId/limit-orders", async (req, res) => {
    try {
      const { guildId } = req.params;
      const { status } = req.query;
      
      // Get all accounts for this guild to show the most recent one (same logic as portfolio)
      const accounts = await storage.getAccountsByGuild(guildId);
      let user = null;
      
      if (accounts.length > 0) {
        // Get the most recently created account (latest user) - same as portfolio
        const account = accounts[accounts.length - 1];
        user = await storage.getUser(account.userId);
      }
      
      // If no accounts exist, create a demo web-client account (fallback)
      if (!user) {
        user = await storage.getUserByDiscordId('web-client');
        if (!user) {
          user = await storage.createUser({
            discordId: 'web-client',
            username: 'Web Client',
            discriminator: '0000',
            avatar: null
          });
        }
      }
      
      const limitOrders = await storage.getUserLimitOrders(guildId, user.id, status as string);
      res.json(limitOrders);
    } catch (error) {
      console.error("Error fetching web client limit orders:", error);
      res.status(500).json({ error: "Failed to fetch limit orders" });
    }
  });

  app.post("/api/web-client/guilds/:guildId/limit-orders", async (req, res) => {
    try {
      const { guildId } = req.params;
      const { symbol, type, shares, targetPrice, expiresAt } = req.body;
      
      console.log('Web client limit order request:', { guildId, symbol, type, shares, targetPrice, expiresAt });
      
      // Get all accounts for this guild to show the most recent one (same logic as portfolio)
      const accounts = await storage.getAccountsByGuild(guildId);
      let user = null;
      
      if (accounts.length > 0) {
        // Get the most recently created account (latest user) - same as portfolio
        const account = accounts[accounts.length - 1];
        user = await storage.getUser(account.userId);
      }
      
      // If no accounts exist, create a demo web-client account (fallback)
      if (!user) {
        user = await storage.getUserByDiscordId('web-client');
        if (!user) {
          user = await storage.createUser({
            discordId: 'web-client',
            username: 'Web Client',
            discriminator: '0000',
            avatar: null
          });
        }
      }
      
      const limitOrder = await tradingEngine.createLimitOrder(guildId, user.id, symbol, type, shares, Number(targetPrice), expiresAt);
      res.json(limitOrder);
    } catch (error: any) {
      console.error('Web client limit order error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/web-client/guilds/:guildId/limit-orders/:orderId", async (req, res) => {
    try {
      const { guildId, orderId } = req.params;
      
      // Get all accounts for this guild to show the most recent one (same logic as portfolio)
      const accounts = await storage.getAccountsByGuild(guildId);
      let user = null;
      
      if (accounts.length > 0) {
        // Get the most recently created account (latest user) - same as portfolio
        const account = accounts[accounts.length - 1];
        user = await storage.getUser(account.userId);
      }
      
      // If no accounts exist, create a demo web-client account (fallback)
      if (!user) {
        user = await storage.getUserByDiscordId('web-client');
        if (!user) {
          return res.status(404).json({ message: "사용자를 찾을 수 없습니다" });
        }
      }
      
      // Get limit order and check ownership
      const limitOrder = await storage.getLimitOrder(orderId);
      if (!limitOrder) {
        return res.status(404).json({ message: "지정가 주문을 찾을 수 없습니다" });
      }
      
      if (limitOrder.userId !== user.id) {
        return res.status(403).json({ message: "자신의 주문만 취소할 수 있습니다" });
      }
      
      await storage.cancelLimitOrder(orderId);
      res.json({ message: "지정가 주문이 취소되었습니다" });
    } catch (error: any) {
      console.error('Web client limit order cancel error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Web client API - Guild overview
  app.get("/api/web-client/guilds/:guildId/overview", async (req, res) => {
    try {
      const { guildId } = req.params;
      
      console.log(`Web client overview request for guild: ${guildId}`);
      
      // Get or create guild settings
      let guildSettings = await storage.getGuildSettings(guildId);
      if (!guildSettings) {
        // Auto-create guild settings for new servers
        const hashedPassword = await bcrypt.hash(Math.random().toString(36).substring(2, 15), 10);
        guildSettings = await storage.createGuildSettings({
          guildId,
          taxRate: '0.02', // Default 2% tax rate
          adminPassword: hashedPassword, // Hashed random default password
          employerRoleId: null
        });
        console.log(`Auto-created guild settings for guild: ${guildId}`);
      }

      // Get portfolio total assets
      const accounts = await storage.getAccountsByGuild(guildId);
      const totalAssets = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

      // Get transaction count (as active trades approximation)
      const transactions = await storage.getRecentTransactions(guildId, 100);
      const activeTrades = transactions ? transactions.length : 0;

      // Get active auctions count
      const auctions = await storage.getAuctionsByGuild(guildId, { status: 'live' });
      const liveAuctions = auctions ? auctions.length : 0;

      // Calculate tax collected (sum of all tax transactions)
      const taxCollected = transactions 
        ? transactions
            .filter(t => t.type === 'tax')
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
        : 0;

      const response = {
        totalAssets,
        activeTrades,
        liveAuctions,
        taxCollected
      };
      
      console.log(`Web client overview response:`, response);
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching web client overview:", error);
      res.status(500).json({ error: "Failed to fetch overview" });
    }
  });

  // Web client specific trade endpoint
  app.post("/api/web-client/guilds/:guildId/trades", async (req, res) => {
    try {
      const { guildId } = req.params;
      const { symbol, type, shares, price } = req.body;
      
      console.log('Web client trade request:', { guildId, symbol, type, shares, price });
      
      // Get all accounts for this guild to show the most recent one (same logic as portfolio)
      const accounts = await storage.getAccountsByGuild(guildId);
      let user = null;
      
      if (accounts.length > 0) {
        // Get the most recently created account (latest user) - same as portfolio
        const account = accounts[accounts.length - 1];
        user = await storage.getUser(account.userId);
      }
      
      // If no accounts exist, create a demo web-client account (fallback)
      if (!user) {
        user = await storage.getUserByDiscordId('web-client');
        if (!user) {
          user = await storage.createUser({
            discordId: 'web-client',
            username: 'Web Client',
            discriminator: '0000',
            avatar: null
          });
        }
      }
      
      const result = await tradingEngine.executeTrade(guildId, user.id, symbol, type, shares, Number(price));
      res.json(result);
    } catch (error: any) {
      console.error('Web client trade error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Portfolio routes
  app.get("/api/guilds/:guildId/users/:userId/portfolio", requireAuth, async (req, res) => {
    try {
      const { guildId, userId } = req.params;
      const holdings = await storage.getHoldingsByUser(guildId, userId);
      const account = await storage.getAccountByUser(guildId, userId);
      const totalValue = await tradingEngine.calculatePortfolioValue(guildId, userId);
      
      res.json({
        holdings,
        account,
        totalValue
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get portfolio" });
    }
  });
  
  // Account routes
  app.get("/api/guilds/:guildId/users/:userId/account", requireAuth, async (req, res) => {
    try {
      const { guildId, userId } = req.params;
      
      // Security: Only allow users to access their own account or if they're guild admin
      if (req.user.id !== userId) {
        const isAdmin = await storage.isGuildAdmin(guildId, req.user.id);
        if (!isAdmin) {
          return res.status(403).json({ message: "자신의 계좌 정보만 조회할 수 있습니다" });
        }
      }
      
      const account = await storage.getAccountByUser(guildId, userId);
      
      res.json({ account });
    } catch (error) {
      res.status(500).json({ message: "Failed to get account" });
    }
  });
  
  // Transaction history
  app.get("/api/guilds/:guildId/users/:userId/transactions", requireAuth, async (req, res) => {
    try {
      const { guildId, userId } = req.params;
      
      // Security: Only allow users to access their own transactions or if they're guild admin
      if (req.user.id !== userId) {
        const isAdmin = await storage.isGuildAdmin(guildId, req.user.id);
        if (!isAdmin) {
          return res.status(403).json({ message: "자신의 거래 내역만 조회할 수 있습니다" });
        }
      }
      
      const transactions = await storage.getTransactionsByUser(guildId, userId, 20);
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });
  
  // Transfer money by account number
  app.post("/api/guilds/:guildId/transfer", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { accountNumber, amount, memo } = req.body;
      const userId = req.user.id;
      
      // Input validation
      if (!accountNumber || typeof accountNumber !== 'string') {
        return res.status(400).json({ message: "계좌번호를 입력해주세요" });
      }
      
      // Validate account number format (3-4 digits)
      if (!/^\d{3,4}$/.test(accountNumber)) {
        return res.status(400).json({ message: "계좌번호는 3-4자리 숫자여야 합니다" });
      }
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: "올바른 송금액을 입력해주세요 (0보다 큰 숫자)" });
      }
      
      if (memo && typeof memo === 'string' && memo.length > 100) {
        return res.status(400).json({ message: "메모는 100자 이하여야 합니다" });
      }
      
      // Find target account by unique code
      const targetAccount = await storage.getAccountByUniqueCode(guildId, accountNumber);
      if (!targetAccount) {
        return res.status(400).json({ message: "계좌번호를 찾을 수 없습니다" });
      }
      
      if (targetAccount.userId === userId) {
        return res.status(400).json({ message: "자신의 계좌로는 송금할 수 없습니다" });
      }
      
      await storage.transferMoney(guildId, userId, targetAccount.userId, amount, memo || '송금');
      
      res.json({ message: "송금이 완료되었습니다" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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

  // Validate auction password before creating auction
  app.post("/api/guilds/:guildId/auctions/validate-password", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "비밀번호가 필요합니다" });
      }

      const auctionPassword = await storage.getAuctionPassword(guildId, password);
      
      if (!auctionPassword) {
        return res.status(400).json({ message: "유효하지 않거나 만료된 비밀번호입니다" });
      }

      // Return the password details for use in auction creation
      res.json({
        valid: true,
        passwordData: {
          id: auctionPassword.id,
          itemName: auctionPassword.itemName,
          startPrice: auctionPassword.startPrice,
          duration: auctionPassword.duration,
          buyoutPrice: auctionPassword.buyoutPrice,
          description: auctionPassword.description
        }
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/guilds/:guildId/auctions", requireAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { password, ...auctionData } = req.body;
      
      // Validate password if provided
      if (password) {
        const auctionPassword = await storage.getAuctionPassword(guildId, password);
        
        if (!auctionPassword) {
          return res.status(400).json({ message: "유효하지 않거나 만료된 비밀번호입니다" });
        }

        // Use password data to create auction
        const endTime = new Date(Date.now() + auctionPassword.duration * 60 * 60 * 1000);
        
        const finalAuctionData = {
          guildId,
          itemType: 'text' as const,
          itemRef: auctionPassword.itemName,
          startPrice: auctionPassword.startPrice,
          buyoutPrice: auctionPassword.buyoutPrice,
          endsAt: endTime,
          description: auctionPassword.description,
          sellerUserId: 'web-dashboard',
          ...auctionData
        };

        const auction = await auctionManager.createAuction(finalAuctionData);
        
        // Mark password as used
        await storage.markAuctionPasswordAsUsed(auctionPassword.id);
        
        res.json(auction);
      } else {
        // Legacy creation without password
        const finalAuctionData = { ...auctionData, guildId };
        const auction = await auctionManager.createAuction(finalAuctionData);
        res.json(auction);
      }
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
      console.error('Candlestick data error:', error);
      res.status(500).json({ message: "Failed to get candlestick data" });
    }
  });

  // News analysis routes
  app.get("/api/guilds/:guildId/news", async (req, res) => {
    try {
      const { guildId } = req.params;
      const { limit = 50 } = req.query;
      
      const news = await storage.getNewsAnalysesByGuild(guildId, {
        limit: Number(limit)
      });
      
      res.json(news);
    } catch (error) {
      res.status(500).json({ message: "Failed to get news analyses" });
    }
  });

  app.post("/api/guilds/:guildId/news/analyze", async (req, res) => {
    try {
      const { guildId } = req.params;
      const { title, content, symbol } = req.body;
      
      // Use storage's analyzeNews method directly
      const analysis = await storage.analyzeNews(guildId, title, content, symbol, 'web-dashboard');
      
      // Broadcast the analysis to WebSocket clients for real-time updates
      wsManager.broadcast('news_analyzed', analysis);
      wsManager.broadcast('stock_price_updated', { guildId });
      
      res.json(analysis);
    } catch (error: any) {
      console.error('News analysis error:', error);
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
