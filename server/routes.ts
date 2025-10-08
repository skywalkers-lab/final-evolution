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
import { generalLimiter, strictLimiter, tradingLimiter, apiLimiter } from "./middleware/rateLimiter";
import "./types";

// Express 세션 타입 확장
declare module 'express-session' {
  interface SessionData {
    authenticatedGuilds?: {
      [guildId: string]: {
        accountId: string;
        authenticatedAt: string;
        passwordHash: string;
      }
    };
    adminGuilds?: string[];
  }
}

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
  const taxScheduler = new TaxScheduler(storage, wsManager);
  const newsAnalyzer = new NewsAnalyzer(storage, wsManager, tradingEngine);

  // Start services
  tradingEngine.start();
  auctionManager.start();
  taxScheduler.start();

  // Initialize Discord bot with shared WebSocket manager (after routes are set)
  if (process.env.DISCORD_BOT_TOKEN) {
    try {
      const { DiscordBot } = await import("./services/discord-bot");
      const discordBot = new DiscordBot(storage, wsManager, tradingEngine);
      
      // Discord Bot을 Trading Engine에 연결 (서킷브레이커 알림용)
      tradingEngine.setDiscordBot(discordBot);
      
      await discordBot.start();
      (global as any).discordBot = discordBot;
      console.log("🎉 Discord bot initialized successfully!");
    } catch (error) {
      console.log(`❌ Failed to initialize Discord bot: ${error}`);
    }
  }

  // Session validation middleware for web client APIs  
  const validateWebClientAuth = (req: any, res: any, next: any) => {
    // 비밀번호 인증 시스템 제거됨 - 모든 요청 허용
    next();
  };

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

  // Roblox game server authentication middleware
  const requireRobloxGameAuth = (req: any, res: any, next: any) => {
    const gameKey = req.headers['x-game-key'];
    const expectedKey = process.env.ROBLOX_GAME_API_KEY;
    
    if (!expectedKey || expectedKey === 'your_secure_game_api_key_here_change_in_production') {
      return res.status(500).json({ 
        message: "Server configuration error: ROBLOX_GAME_API_KEY not properly configured" 
      });
    }
    
    if (!gameKey || gameKey !== expectedKey) {
      console.log('❌ Roblox game auth failed:', { 
        provided: gameKey ? 'present' : 'missing',
        match: gameKey === expectedKey 
      });
      return res.status(403).json({ message: "Invalid game API key" });
    }
    
    next();
  };

  // Apply general rate limiting to all /api routes
  app.use('/api', generalLimiter);

  // Web client API key middleware (for rate limiting sensitive endpoints)
  const requireWebClientKey = (req: any, res: any, next: any) => {
    const clientKey = req.headers['x-client-key'];
    const expectedKey = process.env.WEB_CLIENT_API_KEY;
    
    // If no key is configured, allow access (backward compatibility)
    if (!expectedKey || expectedKey === 'your_secure_web_client_key_here_change_in_production') {
      return next();
    }
    
    if (!clientKey || clientKey !== expectedKey) {
      return res.status(403).json({ message: "Invalid client API key" });
    }
    
    next();
  };

  // Discord OAuth routes
  app.get("/auth/discord", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    let host = req.get('host');
    
    // GitHub Codespaces 환경 감지
    const codespaceUrl = req.get('x-forwarded-host');
    if (codespaceUrl && codespaceUrl.includes('app.github.dev')) {
      host = codespaceUrl;
    }
    
    // 프로덕션 환경에서는 https 사용, 로컬에서는 http 사용
    const protocol = process.env.NODE_ENV === 'production' || host?.includes('railway.app') || host?.includes('app.github.dev') ? 'https' : 'http';
    const redirectUri = `${protocol}://${host}/auth/discord/callback`;
    const scopes = "identify guilds";
    
    console.log('🔐 Discord OAuth redirect URI:', redirectUri);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🌐 Host:', host);
    console.log('🔗 X-Forwarded-Host:', codespaceUrl);
    
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
    
    res.redirect(authUrl);
  });

  app.get("/auth/discord/callback", async (req, res) => {
    console.log('🔵 Discord OAuth callback received:', {
      query: req.query,
      queryKeys: Object.keys(req.query),
      code: req.query.code ? 'present' : 'missing',
      error: req.query.error || 'none',
      error_description: req.query.error_description || 'none',
      host: req.get('host'),
      'x-forwarded-host': req.get('x-forwarded-host'),
      fullUrl: req.url,
      originalUrl: req.originalUrl
    });
    
    // Discord에서 에러를 반환한 경우
    if (req.query.error) {
      console.log('❌ Discord OAuth error:', req.query.error, req.query.error_description);
      return res.status(400).send(`Discord OAuth error: ${req.query.error} - ${req.query.error_description || 'No description'}`);
    }
    
    // 간단한 응답으로 테스트
    if (!req.query.code) {
      console.log('❌ No code provided in callback');
      return res.status(400).send('No authorization code provided. Please check Discord Developer Portal redirect URI settings.');
    }
    
    try {
      const { code } = req.query;
      
      if (!code) {
        console.log('❌ No code provided in callback');
        return res.redirect("/?error=no_code");
      }

      const clientId = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;
      let host = req.get('host');
      
      // GitHub Codespaces 환경 감지
      const codespaceUrl = req.get('x-forwarded-host');
      if (codespaceUrl && codespaceUrl.includes('app.github.dev')) {
        host = codespaceUrl;
      }
      
      // 프로덕션 환경에서는 https 사용, 로컬에서는 http 사용
      const protocol = process.env.NODE_ENV === 'production' || host?.includes('railway.app') || host?.includes('app.github.dev') ? 'https' : 'http';
      const redirectUri = `${protocol}://${host}/auth/discord/callback`;

      console.log('🔄 Exchanging code for token:', {
        clientId: clientId ? 'present' : 'missing',
        clientSecret: clientSecret ? 'present' : 'missing',
        redirectUri,
        host,
        codespaceUrl
      });

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
      console.log('✅ Successfully got access token');

      // Get user info
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });

      const discordUser = userResponse.data;
      console.log('✅ Got Discord user info:', {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator
      });

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
      // 환경에 따라 secure, sameSite 옵션을 명확히 지정
      const isProd = process.env.NODE_ENV === 'production' || host?.includes('railway.app') || host?.includes('app.github.dev');
      res.cookie('session_token', sessionToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd
      });
      console.log('🍪 Session cookie set, redirecting to home page');
      res.redirect('/');
    } catch (error) {
      console.error('❌ Discord OAuth error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
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
      const botGuildIds = (global as any).botGuildIds || [];
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
    const botGuildIds = (global as any).botGuildIds || [];
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

  // Admin auth routes (guild password) - with strict rate limiting
  app.post("/api/auth/admin-login", strictLimiter, async (req, res) => {
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
      
      // 인증된 사용자인지 확인
      if (!req.isAuthenticated()) {
        console.log('Web client account response: not authenticated');
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const user = req.user as any;
      console.log(`Authenticated user: ${user.id} (discordId: ${user.discordId})`);
      
      // 해당 사용자의 계정을 찾기
      const account = await storage.getAccountByUser(guildId, user.id);
      
      if (!account) {
        console.log('Web client account response: no account found for authenticated user');
        return res.json({ account: null });
      }
      
      console.log(`Web client account response:`, {
        id: account.id,
        uniqueCode: account.uniqueCode,
        balance: account.balance
      });
      
      res.json({
        account: {
          id: account.id,
          uniqueCode: account.uniqueCode,
          balance: account.balance
        }
      });
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

  // Circuit breaker status (all)
  app.get("/api/web-client/guilds/:guildId/circuit-breakers", async (req, res) => {
    try {
      const { guildId } = req.params;
      const breakers = tradingEngine.getCircuitBreakers(guildId);
      res.json(breakers);
    } catch (error) {
      console.error('Circuit breakers error:', error);
      res.json([]);
    }
  });

  // Circuit breaker status (specific stock)
  app.get("/api/web-client/guilds/:guildId/stocks/:symbol/circuit-breaker", async (req, res) => {
    try {
      const { guildId, symbol } = req.params;
      const breaker = tradingEngine.getCircuitBreaker(guildId, symbol);
      
      if (breaker) {
        const now = Date.now();
        const remainingMs = breaker.resumeAt - now;
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        
        res.json({
          active: true,
          triggeredAt: new Date(breaker.triggeredAt).toISOString(),
          resumesAt: new Date(breaker.resumeAt).toISOString(),
          remainingMinutes: remainingMinutes > 0 ? remainingMinutes : 0,
        });
      } else {
        res.json({
          active: false,
        });
      }
    } catch (error) {
      console.error('Circuit breaker status error:', error);
      res.json({ active: false });
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

  // Web client order book (호가창)
  app.get("/api/web-client/guilds/:guildId/stocks/:symbol/orderbook", async (req, res) => {
    try {
      const { guildId, symbol } = req.params;
      const depth = parseInt(req.query.depth as string) || 10;
      console.log(`Web client order book request: ${guildId}/${symbol} (depth: ${depth})`);
      
      const orderBook = await storage.getOrderBook(guildId, symbol, depth);
      const bestBidAsk = await storage.getBestBidAsk(guildId, symbol);
      
      res.json({
        bids: orderBook.bids,
        asks: orderBook.asks,
        bestBid: bestBidAsk.bestBid,
        bestAsk: bestBidAsk.bestAsk,
        spread: bestBidAsk.spread,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Web client order book error:', error);
      res.status(500).json({ message: "Failed to get order book" });
    }
  });

  // Web client market depth
  app.get("/api/web-client/guilds/:guildId/stocks/:symbol/depth", async (req, res) => {
    try {
      const { guildId, symbol } = req.params;
      console.log(`Web client market depth request: ${guildId}/${symbol}`);
      
      const depth = await storage.getMarketDepth(guildId, symbol);
      
      if (!depth) {
        // If no market depth exists, generate from order book
        await storage.updateMarketDepth(guildId, symbol);
        const newDepth = await storage.getMarketDepth(guildId, symbol);
        return res.json(newDepth || { bidPrices: [], askPrices: [], spread: null });
      }
      
      res.json(depth);
    } catch (error) {
      console.error('Web client market depth error:', error);
      res.status(500).json({ message: "Failed to get market depth" });
    }
  });

  // Web client 실시간 시세 (Real-time Quote)
  app.get("/api/web-client/guilds/:guildId/stocks/:symbol/quote", async (req, res) => {
    try {
      const { guildId, symbol } = req.params;
      console.log(`Web client quote request: ${guildId}/${symbol}`);
      
      const stock = await storage.getStockBySymbol(guildId, symbol);
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }

      // 캔들스틱 데이터로부터 오늘의 시가/고가/저가 계산
      const todayCandlestick = await storage.getCandlestickData(guildId, symbol, '1d', 1);
      const recentCandlestick = await storage.getCandlestickData(guildId, symbol, '1h', 24);
      
      const currentPrice = Number(stock.price);
      let openPrice = currentPrice;
      let highPrice = currentPrice;
      let lowPrice = currentPrice;
      
      if (todayCandlestick.length > 0) {
        openPrice = Number(todayCandlestick[0].open);
        highPrice = Number(todayCandlestick[0].high);
        lowPrice = Number(todayCandlestick[0].low);
      } else if (recentCandlestick.length > 0) {
        // 최근 24시간 데이터로 대체
        openPrice = Number(recentCandlestick[0].open);
        highPrice = Math.max(...recentCandlestick.map(c => Number(c.high)));
        lowPrice = Math.min(...recentCandlestick.map(c => Number(c.low)));
      }

      // 거래량 계산 (최근 거래 내역 기반) - type 필터 제거
      const transactions = await storage.getCombinedTransactionHistoryForAdmin(guildId, { 
        limit: 100
      });
      const todayTransactions = transactions.filter((t: any) => {
        const transDate = new Date(t.createdAt);
        const today = new Date();
        // 주식 관련 거래만 필터링
        const isStockTransaction = t.type === 'stock_purchase' || t.type === 'stock_sale';
        return transDate.toDateString() === today.toDateString() && isStockTransaction && t.symbol === symbol;
      });
      
      const volume = todayTransactions.reduce((sum: number, t: any) => 
        sum + (t.shares || 0), 0
      );
      const volumeAmount = todayTransactions.reduce((sum: number, t: any) => 
        sum + (t.shares || 0) * (t.price || 0), 0
      );

      // 52주 고저가 (임시: 현재가 기준 ±30%)
      const high52Week = currentPrice * 1.3;
      const low52Week = currentPrice * 0.7;

      // 이전 종가 (어제 종가 - 임시: 현재가 기준)
      const previousClose = openPrice || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      // 상하한가 (±30%)
      const highLimit = previousClose * 1.3;
      const lowLimit = previousClose * 0.7;

      // 시가총액
      const outstandingShares = stock.totalShares || 1000000;
      const marketCap = currentPrice * outstandingShares;

      const quote = {
        symbol: stock.symbol,
        name: stock.name,
        currentPrice,
        openPrice,
        highPrice,
        lowPrice,
        previousClose,
        change,
        changePercent,
        volume,
        volumeAmount,
        highLimit,
        lowLimit,
        high52Week,
        low52Week,
        marketCap,
        outstandingShares,
        updatedAt: new Date().toISOString()
      };

      res.json(quote);
    } catch (error) {
      console.error('Web client quote error:', error);
      res.status(500).json({ message: "Failed to get quote" });
    }
  });

  // Web client 체결 내역 (Trade Executions)
  app.get("/api/web-client/guilds/:guildId/stocks/:symbol/executions", async (req, res) => {
    try {
      const { guildId, symbol } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      console.log(`Web client executions request: ${guildId}/${symbol}`);
      
      // 최근 거래 내역 가져오기 - type 필터 제거
      const transactions = await storage.getCombinedTransactionHistoryForAdmin(guildId, { 
        limit
      });

      // 해당 종목의 주식 거래만 필터링
      const executions = transactions
        .filter((t: any) => {
          const isStockTransaction = t.type === 'stock_purchase' || t.type === 'stock_sale';
          return isStockTransaction && t.symbol === symbol && t.shares && t.price;
        })
        .map((t: any, index: number, array: any[]) => {
          const prevPrice = index < array.length - 1 ? array[index + 1].price : t.price;
          return {
            id: t.id,
            price: Number(t.price),
            quantity: t.shares,
            type: t.type === 'stock_purchase' ? 'buy' : 'sell',
            timestamp: t.createdAt,
            change: Number(t.price) - Number(prevPrice)
          };
        });

      res.json(executions);
    } catch (error) {
      console.error('Web client executions error:', error);
      res.status(500).json({ message: "Failed to get executions" });
    }
  });

  // Web client 기술적 지표 (Technical Indicators)
  app.get("/api/web-client/guilds/:guildId/stocks/:symbol/indicators", async (req, res) => {
    try {
      const { guildId, symbol } = req.params;
      const { timeframe = '1h' } = req.query;
      console.log(`Web client indicators request: ${guildId}/${symbol} (${timeframe})`);
      
      // 캔들스틱 데이터 가져오기 (최대 200개)
      const candlestickData = await storage.getCandlestickData(guildId, symbol, timeframe as string, 200);
      
      if (candlestickData.length === 0) {
        return res.json({
          sma5: [],
          sma20: [],
          sma60: [],
          sma120: [],
          ema12: [],
          ema26: [],
          rsi: [],
          macd: { macd: [], signal: [], histogram: [] },
          bollingerBands: { upper: [], middle: [], lower: [] },
          stochastic: { k: [], d: [] },
          atr: []
        });
      }

      // 기술적 지표 계산
      const { calculateAllIndicators } = await import('./utils/technical-indicators');
      const formattedData = candlestickData.map(c => ({
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume || 0),
        timestamp: new Date(c.timestamp)
      }));

      const indicators = calculateAllIndicators(formattedData);
      res.json(indicators);
    } catch (error) {
      console.error('Web client indicators error:', error);
      res.status(500).json({ message: "Failed to calculate indicators" });
    }
  });

  app.get("/api/web-client/guilds/:guildId/portfolio", async (req, res) => {
    try {
      const { guildId } = req.params;
      console.log(`Web client portfolio request for guild: ${guildId}`);
      
      // 인증된 사용자인지 확인
      if (!req.isAuthenticated()) {
        console.log('Web client portfolio response: not authenticated');
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const user = req.user as any;
      console.log(`Authenticated user portfolio: ${user.id} (discordId: ${user.discordId})`);
      
      // 해당 사용자의 계정을 찾기
      const account = await storage.getAccountByUser(guildId, user.id);
      
      if (!account) {
        console.log('Web client portfolio response: no account found for authenticated user');
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
        // Skip holdings with zero shares
        if (holding.shares <= 0) {
          continue;
        }
        
        const stock = await storage.getStockBySymbol(guildId, holding.symbol);
        const currentPrice = stock ? Number(stock.price) : 0;
        const enrichedHolding = {
          ...holding,
          name: stock?.name || holding.symbol,
          currentPrice,
          logoUrl: stock?.logoUrl, // 로고 URL 추가
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

  // Web client news endpoint
  app.get("/api/web-client/guilds/:guildId/news", async (req, res) => {
    try {
      const { guildId } = req.params;
      console.log(`Web client news request for guild: ${guildId}`);
      
      const news = await storage.getNewsAnalysesByGuild(guildId);
      res.json(news || []);
    } catch (error) {
      console.error('Web client news error:', error);
      res.json([]);
    }
  });

  // Web client news analyze endpoint
  app.post("/api/web-client/guilds/:guildId/news/analyze", async (req, res) => {
    try {
      const { guildId } = req.params;
      const { title, content, symbol } = req.body;
      console.log(`Web client news analyze request for guild: ${guildId}`);
      
      // Use storage's analyzeNews method directly
      const analysis = await storage.analyzeNews(guildId, title, content, symbol, 'web-client');
      
      // Broadcast the analysis to WebSocket clients for real-time updates
      wsManager.broadcast('news_analyzed', analysis);
      wsManager.broadcast('stock_price_updated', { guildId });
      
      res.json(analysis);
    } catch (error: any) {
      console.error('Web client news analysis error:', error);
      res.status(400).json({ message: error.message });
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
  app.post("/api/guilds/:guildId/trades", requireAuth, tradingLimiter, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { userId, symbol, type, shares, price } = req.body;
      
      const result = await tradingEngine.executeTrade(guildId, userId, symbol, type, shares, Number(price));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Web client trading route (no auth required) - with trading rate limiting
  app.post("/api/web-client/guilds/:guildId/trades", tradingLimiter, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { symbol, type, shares, price } = req.body;
      
      console.log('Web client trade request:', { guildId, symbol, type, shares, price });
      
      // Get all accounts for this guild
      const accounts = await storage.getAccountsByGuild(guildId);
      let userId = null;
      
      console.log(`Found ${accounts.length} accounts for guild ${guildId}:`, accounts.map(acc => ({ id: acc.id, userId: acc.userId, balance: acc.balance })));
      
      if (accounts.length > 0) {
        let foundAccount = null;
        
        if (type === 'sell') {
          // 매도 주문의 경우: 해당 종목을 보유한 계좌를 우선 선택
          console.log(`🔍 매도 주문 - ${symbol} 보유 계좌 탐색 중...`);
          
          for (const account of accounts) {
            const holding = await storage.getHolding(guildId, account.userId, symbol);
            if (holding && holding.shares >= shares) {
              foundAccount = account;
              console.log(`✅ ${symbol} ${shares}주 보유 계좌 발견:`, {
                uniqueCode: account.uniqueCode,
                userId: account.userId,
                balance: account.balance,
                holdingShares: holding.shares
              });
              break;
            }
          }
          
          // 보유 계좌를 찾지 못한 경우에도 기본 계좌 선택 시도
          if (!foundAccount) {
            console.log(`❌ ${symbol} ${shares}주 보유 계좌를 찾을 수 없음. 기본 계좌 사용 시도.`);
          }
        }
        
        // 매수 주문이거나 매도용 보유 계좌를 찾지 못한 경우: 잔액이 가장 높은 계좌 사용
        if (!foundAccount) {
          foundAccount = accounts.reduce((prev, current) => 
            Number(current.balance) > Number(prev.balance) ? current : prev
          );
          console.log('💰 잔액 기준 계좌 선택:', {
            type,
            uniqueCode: foundAccount.uniqueCode,
            balance: foundAccount.balance
          });
        }
        
        if (foundAccount) {
          userId = foundAccount.userId;
          console.log('🎯 Web client selected account:', { 
            uniqueCode: foundAccount.uniqueCode, 
            userId: foundAccount.userId, 
            balance: foundAccount.balance 
          });
        }
      }
      
      // If no suitable account found, create a demo web-client account
      if (!userId) {
        console.log('No suitable account found, creating web-client account...');
        let user = await storage.getUserByDiscordId('web-client');
        if (!user) {
          user = await storage.createUser({
            discordId: 'web-client',
            username: 'Web Client',
            discriminator: '0000',
            avatar: null
          });
        }
        
        // Check if account exists for this user and guild
        let account = await storage.getAccountByUser(guildId, user.id);
        if (!account) {
          account = await storage.createAccount({
            guildId,
            userId: user.id,
            uniqueCode: Math.floor(1000 + Math.random() * 9000).toString(),
            balance: '1000000.00', // 1M won starting balance for demo
            // password will be set separately after account creation
          });
        }
        
        userId = user.id;
        console.log('Created/found web-client account:', { userId: user.id, accountId: account.id });
      }
      
      if (!userId) {
        return res.status(400).json({ message: "사용자 계정을 찾을 수 없습니다" });
      }
      
      console.log('About to execute trade with:', { guildId, userId, symbol, type, shares, price });
      
      // Double-check account exists before trading
      const verifyAccount = await storage.getAccountByUser(guildId, userId);
      console.log('Account verification:', verifyAccount ? { id: verifyAccount.id, balance: verifyAccount.balance } : 'null');
      
      if (!verifyAccount) {
        console.error('Account verification failed - account not found for userId:', userId);
        return res.status(400).json({ message: "선택된 계좌를 찾을 수 없습니다. 계좌를 다시 확인해주세요." });
      }
      
      const result = await tradingEngine.executeTrade(guildId, userId, symbol, type, shares, Number(price));
      console.log('Trade executed successfully:', result);
      res.json(result);
    } catch (error: any) {
      console.error('Web client trade error:', error);
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

  app.post("/api/guilds/:guildId/limit-orders", requireAuth, tradingLimiter, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { symbol, type, shares, targetPrice, expiresAt } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const limitOrder = await tradingEngine.createLimitOrder(guildId, userId, symbol, type, shares, Number(targetPrice), expiresAt);
      res.json(limitOrder);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/guilds/:guildId/limit-orders/:orderId", requireAuth, async (req, res) => {
    try {
      const { guildId, orderId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
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

  // Web client limit orders API - show ALL limit orders for this guild
  app.get("/api/web-client/guilds/:guildId/limit-orders", async (req, res) => {
    try {
      const { guildId } = req.params;
      const { status } = req.query;
      
      // Get ALL limit orders for this guild (not just one user's orders)
      const limitOrders = await storage.getLimitOrdersByGuild(guildId, status as string);
      res.json(limitOrders);
    } catch (error) {
      console.error("Error fetching web client limit orders:", error);
      res.status(500).json({ error: "Failed to fetch limit orders" });
    }
  });

  app.post("/api/web-client/guilds/:guildId/limit-orders", tradingLimiter, async (req, res) => {
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
      
      const limitOrder = await tradingEngine.createLimitOrder(guildId, user.id, symbol, type, shares, Number(targetPrice), expiresAt ? new Date(expiresAt) : undefined);
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
  // Account password authentication for web dashboard
  app.post("/api/web-client/guilds/:guildId/auth", strictLimiter, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { password } = req.body;
      
      console.log(`Web client auth request for guild: ${guildId}`);
      
      if (!password) {
        return res.status(400).json({ message: "비밀번호가 필요합니다." });
      }
      
      // Get all accounts for this guild
      const accounts = await storage.getAccountsByGuild(guildId);
      
      if (accounts.length === 0) {
        return res.status(404).json({ message: "이 서버에 등록된 계좌를 찾을 수 없습니다." });
      }
      
      // Check if any account has matching password
      let authenticatedAccount = null;
      for (const account of accounts) {
        if (account.password && account.password === password) {
          authenticatedAccount = account;
          break;
        }
      }
      
      if (!authenticatedAccount) {
        return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
      }
      
      // Store authentication in session
      if (req.session) {
        req.session.authenticatedGuilds = req.session.authenticatedGuilds || {};
        req.session.authenticatedGuilds[guildId] = {
          accountId: authenticatedAccount.id,
          authenticatedAt: new Date().toISOString(),
          passwordHash: password // Store current password for validation
        };
      }
      
      console.log(`✅ Account authenticated for guild ${guildId}, account: ${authenticatedAccount.uniqueCode}`);
      
      res.json({ 
        success: true,
        account: {
          id: authenticatedAccount.id,
          uniqueCode: authenticatedAccount.uniqueCode
        }
      });
    } catch (error) {
      console.error('Web client auth error:', error);
      res.status(500).json({ message: "인증 중 오류가 발생했습니다." });
    }
  });

  // Add logout endpoint to clear sessions
  app.post("/api/web-client/guilds/:guildId/logout", (req, res) => {
    const { guildId } = req.params;
    
    const session = req.session as any;
    if (session && session.authenticatedGuilds) {
      delete session.authenticatedGuilds[guildId];
      console.log(`🚪 User logged out from guild ${guildId}`);
    }
    
    res.json({ success: true });
  });

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

  // Web client specific trade endpoint - with trading rate limiting
  app.post("/api/web-client/guilds/:guildId/trades", tradingLimiter, async (req, res) => {
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

  // User list route  
  app.get("/api/guilds/:guildId/users", async (req, res) => {
    try {
      const { guildId } = req.params;
      const users = await storage.getUsersByGuild(guildId);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
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
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      if (currentUserId !== userId) {
        const isAdmin = await storage.isGuildAdmin(guildId, currentUserId);
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
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      if (currentUserId !== userId) {
        const isAdmin = await storage.isGuildAdmin(guildId, currentUserId);
        if (!isAdmin) {
          return res.status(403).json({ message: "자신의 거래 내역만 조회할 수 있습니다" });
        }
      }
      
      const transactions = await storage.getCombinedTransactionHistory(guildId, userId, 20);
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });
  
  // Transfer money by account number
  app.post("/api/guilds/:guildId/transfer", requireAuth, tradingLimiter, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { accountNumber, amount, memo } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
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
        const duration = auctionPassword.duration || 24; // Default to 24 hours if null
        const endTime = new Date(Date.now() + duration * 60 * 60 * 1000);
        
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
      
      const transactions = await storage.getCombinedTransactionHistoryForAdmin(guildId, {
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

  // ==================== ROBLOX INTEGRATION API ====================

  // Generate verification code for linking Roblox account
  app.post("/api/roblox/link/request", apiLimiter, async (req, res) => {
    try {
      const { discordUserId } = req.body;
      
      if (!discordUserId) {
        return res.status(400).json({ message: "Discord user ID is required" });
      }

      // Generate 8-digit verification code
      const verificationCode = Math.floor(10000000 + Math.random() * 90000000).toString();
      
      const link = await storage.createRobloxLinkRequest(discordUserId, verificationCode);
      
      console.log(`🔗 Roblox link request created for Discord user ${discordUserId}: ${verificationCode}`);
      
      res.json({
        verificationCode,
        expiresAt: link.expiresAt,
        message: "Enter this code in the Roblox game to verify your account"
      });
    } catch (error: any) {
      console.error('Roblox link request error:', error);
      res.status(500).json({ message: "Failed to create link request" });
    }
  });

  // Verify Roblox account with code (called from Roblox game server)
  app.post("/api/roblox/link/verify", requireRobloxGameAuth, apiLimiter, async (req, res) => {
    try {
      const { verificationCode, robloxUserId, robloxUsername } = req.body;
      
      if (!verificationCode || !robloxUserId || !robloxUsername) {
        return res.status(400).json({ 
          message: "Verification code, Roblox user ID, and username are required" 
        });
      }

      // Find pending link by verification code
      const link = await storage.getRobloxLinkByVerificationCode(verificationCode);
      
      if (!link) {
        return res.status(404).json({ 
          message: "Invalid or expired verification code" 
        });
      }

      // Check if code is expired
      if (new Date() > new Date(link.expiresAt)) {
        await storage.expireRobloxLinks();
        return res.status(400).json({ 
          message: "Verification code has expired. Please request a new one." 
        });
      }

      // Check if this Roblox account is already linked to another Discord account
      const existingLink = await storage.getRobloxLinkByRobloxId(robloxUserId);
      if (existingLink && existingLink.discordUserId !== link.discordUserId) {
        return res.status(400).json({ 
          message: "This Roblox account is already linked to another Discord account" 
        });
      }

      // Verify the link
      const verifiedLink = await storage.verifyRobloxLink(
        link.discordUserId, 
        robloxUserId, 
        robloxUsername
      );

      console.log(`✅ Roblox account verified: ${robloxUsername} (${robloxUserId}) → Discord ${link.discordUserId}`);

      res.json({
        success: true,
        discordUserId: verifiedLink.discordUserId,
        robloxUserId: verifiedLink.robloxUserId,
        robloxUsername: verifiedLink.robloxUsername,
        verifiedAt: verifiedLink.verifiedAt
      });
    } catch (error: any) {
      console.error('Roblox link verification error:', error);
      res.status(500).json({ message: "Failed to verify link" });
    }
  });

  // Get link status for a Discord user
  app.get("/api/roblox/link/status/:discordUserId", async (req, res) => {
    try {
      const { discordUserId } = req.params;
      
      const link = await storage.getRobloxLinkByDiscordId(discordUserId);
      
      if (!link) {
        return res.json({ linked: false });
      }

      res.json({
        linked: link.status === 'verified',
        status: link.status,
        robloxUserId: link.robloxUserId,
        robloxUsername: link.robloxUsername,
        verifiedAt: link.verifiedAt
      });
    } catch (error) {
      console.error('Roblox link status error:', error);
      res.status(500).json({ message: "Failed to get link status" });
    }
  });

  // Unlink Roblox account
  app.delete("/api/roblox/link/:discordUserId", async (req, res) => {
    try {
      const { discordUserId } = req.params;
      
      await storage.deleteRobloxLink(discordUserId);
      
      console.log(`🔓 Roblox link deleted for Discord user ${discordUserId}`);
      
      res.json({ success: true, message: "Roblox account unlinked" });
    } catch (error) {
      console.error('Roblox unlink error:', error);
      res.status(500).json({ message: "Failed to unlink account" });
    }
  });

  // Get balance for a Roblox user (called from Roblox game server)
  app.get("/api/roblox/economy/balance/:robloxUserId", requireRobloxGameAuth, async (req, res) => {
    try {
      const { robloxUserId } = req.params;
      const { guildId } = req.query;
      
      if (!guildId) {
        return res.status(400).json({ message: "Guild ID is required" });
      }

      // Find linked Discord account
      const link = await storage.getRobloxLinkByRobloxId(robloxUserId);
      
      if (!link || link.status !== 'verified') {
        return res.status(404).json({ 
          message: "Roblox account not linked to any Discord account" 
        });
      }

      // Get Discord user
      const user = await storage.getUserByDiscordId(link.discordUserId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get account balance
      const account = await storage.getAccountByUser(guildId as string, user.id);
      
      if (!account) {
        return res.status(404).json({ 
          message: "No account found for this user in the specified guild" 
        });
      }

      res.json({
        robloxUserId,
        discordUserId: link.discordUserId,
        balance: account.balance,
        frozen: account.frozen,
        tradingSuspended: account.tradingSuspended
      });
    } catch (error) {
      console.error('Roblox balance fetch error:', error);
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });

  // Adjust balance for a Roblox user (called from Roblox game server)
  app.post("/api/roblox/economy/adjust", requireRobloxGameAuth, apiLimiter, async (req, res) => {
    try {
      const { robloxUserId, guildId, amount, memo } = req.body;
      
      if (!robloxUserId || !guildId || amount === undefined) {
        return res.status(400).json({ 
          message: "Roblox user ID, guild ID, and amount are required" 
        });
      }

      // Validate amount
      const adjustAmount = Number(amount);
      if (isNaN(adjustAmount)) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Find linked Discord account
      const link = await storage.getRobloxLinkByRobloxId(robloxUserId);
      
      if (!link || link.status !== 'verified') {
        return res.status(404).json({ 
          message: "Roblox account not linked" 
        });
      }

      // Get Discord user
      const user = await storage.getUserByDiscordId(link.discordUserId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get account
      const account = await storage.getAccountByUser(guildId, user.id);
      
      if (!account) {
        return res.status(404).json({ 
          message: "No account found for this user in the specified guild" 
        });
      }

      if (account.frozen) {
        return res.status(403).json({ message: "Account is frozen" });
      }

      // Check balance for withdrawals
      if (adjustAmount < 0) {
        const currentBalance = Number(account.balance);
        if (currentBalance + adjustAmount < 0) {
          return res.status(400).json({ message: "Insufficient balance" });
        }
      }

      // Update balance
      await storage.updateBalance(account.id, adjustAmount);

      // Create transaction record
      await storage.addTransaction({
        guildId,
        actorId: user.id,
        fromUserId: adjustAmount < 0 ? user.id : undefined,
        toUserId: adjustAmount > 0 ? user.id : undefined,
        type: adjustAmount > 0 ? 'admin_deposit' : 'admin_withdraw',
        amount: Math.abs(adjustAmount).toString(),
        memo: memo || `Roblox game: ${adjustAmount > 0 ? 'deposit' : 'withdrawal'}`
      });

      // Get updated account
      const updatedAccount = await storage.getAccount(account.id);

      console.log(`💰 Roblox economy adjustment: ${robloxUserId} ${adjustAmount > 0 ? '+' : ''}${adjustAmount} (${memo || 'no memo'})`);

      // Broadcast balance update via WebSocket
      wsManager.broadcast('balance_updated', {
        guildId,
        userId: user.id,
        balance: updatedAccount!.balance,
        change: adjustAmount
      });

      res.json({
        success: true,
        robloxUserId,
        discordUserId: link.discordUserId,
        newBalance: updatedAccount!.balance,
        adjustment: adjustAmount
      });
    } catch (error: any) {
      console.error('Roblox balance adjustment error:', error);
      res.status(500).json({ message: error.message || "Failed to adjust balance" });
    }
  });

  // Get portfolio for a Roblox user (called from Roblox game server)
  app.get("/api/roblox/economy/portfolio/:robloxUserId", requireRobloxGameAuth, async (req, res) => {
    try {
      const { robloxUserId } = req.params;
      const { guildId } = req.query;
      
      if (!guildId) {
        return res.status(400).json({ message: "Guild ID is required" });
      }

      // Find linked Discord account
      const link = await storage.getRobloxLinkByRobloxId(robloxUserId);
      
      if (!link || link.status !== 'verified') {
        return res.status(404).json({ 
          message: "Roblox account not linked" 
        });
      }

      // Get Discord user
      const user = await storage.getUserByDiscordId(link.discordUserId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get account and holdings
      const account = await storage.getAccountByUser(guildId as string, user.id);
      const holdings = await storage.getHoldingsByUser(guildId as string, user.id);

      // Enrich holdings with current prices
      const enrichedHoldings = [];
      let stocksValue = 0;

      for (const holding of holdings || []) {
        if (holding.shares <= 0) continue;

        const stock = await storage.getStockBySymbol(guildId as string, holding.symbol);
        const currentPrice = stock ? Number(stock.price) : 0;
        
        enrichedHoldings.push({
          symbol: holding.symbol,
          name: stock?.name || holding.symbol,
          shares: holding.shares,
          avgPrice: holding.avgPrice,
          currentPrice,
          totalValue: holding.shares * currentPrice,
          profitLoss: (currentPrice - Number(holding.avgPrice)) * holding.shares
        });

        stocksValue += holding.shares * currentPrice;
      }

      const totalValue = (account ? Number(account.balance) : 0) + stocksValue;

      res.json({
        robloxUserId,
        discordUserId: link.discordUserId,
        balance: account?.balance || '0',
        holdings: enrichedHoldings,
        totalValue
      });
    } catch (error) {
      console.error('Roblox portfolio fetch error:', error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  return httpServer;
}
