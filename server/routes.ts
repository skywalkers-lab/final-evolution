import type { Express } from "express";
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

  // Discord OAuth routes
  app.get("/auth/discord", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    // Use REPLIT_DOMAINS environment variable for correct redirect URI
    const domain = process.env.REPLIT_DOMAINS || req.get('host');
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
      const domain = process.env.REPLIT_DOMAINS || req.get('host');
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
      res.cookie('session_token', sessionToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
      res.redirect('/');
    } catch (error) {
      console.error('Discord OAuth error:', error);
      res.redirect('/?error=auth_failed');
    }
  });

  app.get("/api/me", async (req, res) => {
    try {
      const sessionToken = req.cookies.session_token;
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
      const botGuildIds = global.discordBot ? global.discordBot.getBotGuildIds() : [];
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
    const botGuildIds = global.discordBot ? global.discordBot.getBotGuildIds() : [];
    res.json({
      botGuildIds,
      botConnected: !!global.discordBot,
      clientReady: global.discordBot?.isReady() || false
    });
  });

  app.post("/auth/logout", (req, res) => {
    res.clearCookie('session_token');
    res.json({ message: "Logged out successfully" });
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
  app.get("/api/guilds/:guildId/stocks", async (req, res) => {
    try {
      const { guildId } = req.params;
      let stocks = await storage.getStocksByGuild(guildId);
      
      // 주식이 없으면 샘플 데이터 생성
      if (stocks.length === 0) {
        const sampleStocks = [
          { symbol: 'AAPL', name: '애플', price: '175000', status: 'active' as const },
          { symbol: 'GOOGL', name: '구글', price: '2800000', status: 'active' as const },
          { symbol: 'MSFT', name: '마이크로소프트', price: '380000', status: 'active' as const },
          { symbol: 'TSLA', name: '테슬라', price: '240000', status: 'active' as const },
          { symbol: 'NVDA', name: '엔비디아', price: '720000', status: 'active' as const },
        ];
        
        for (const stockData of sampleStocks) {
          try {
            await storage.createStock({
              id: `${guildId}-${stockData.symbol}`,
              guildId,
              symbol: stockData.symbol,
              name: stockData.name,
              price: stockData.price,
              status: stockData.status
            });
          } catch (error) {
            console.error(`Failed to create stock ${stockData.symbol}:`, error);
          }
        }
        
        stocks = await storage.getStocksByGuild(guildId);
      }
      
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

  // Web client portfolio (no auth required)
  app.get("/api/guilds/users/web-client/portfolio", async (req, res) => {
    try {
      // Return sample portfolio with account data
      const samplePortfolio = {
        holdings: [],
        account: {
          id: 'web-client-account',
          balance: '1000000', // 100만원
          frozen: false
        },
        totalValue: 1000000
      };
      
      res.json(samplePortfolio);
    } catch (error) {
      res.status(500).json({ message: "Failed to get web client portfolio" });
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
      
      let data = await storage.getCandlestickData(guildId, symbol, timeframe as string, Number(limit));
      
      // 데이터가 없으면 샘플 데이터 생성
      if (data.length === 0) {
        const stock = await storage.getStockBySymbol(guildId, symbol);
        if (stock) {
          const basePrice = Number(stock.price);
          const sampleData = [];
          
          for (let i = 0; i < 20; i++) {
            const variation = Math.random() * 0.1 - 0.05; // ±5% 변동
            const open = basePrice * (1 + variation);
            const close = open * (1 + (Math.random() * 0.04 - 0.02)); // ±2% 추가 변동
            const high = Math.max(open, close) * (1 + Math.random() * 0.02); // 최대 2% 더 높게
            const low = Math.min(open, close) * (1 - Math.random() * 0.02); // 최대 2% 더 낮게
            
            const candleData = {
              open: String(Math.floor(open)),
              high: String(Math.floor(high)),
              low: String(Math.floor(low)),
              close: String(Math.floor(close)),
              volume: String(Math.floor(Math.random() * 10000 + 1000)),
              timestamp: new Date(Date.now() - (19 - i) * 60 * 60 * 1000) // 1시간 간격
            };
            
            sampleData.push(candleData);
            
            // DB에도 저장
            await storage.addCandlestickData(guildId, symbol, candleData);
          }
          
          data = sampleData;
        }
      }
      
      res.json(data);
    } catch (error) {
      console.error('Candlestick data error:', error);
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
