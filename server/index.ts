import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { DiscordBot } from "./services/discord-bot";
import { WebSocketManager } from "./services/websocket-manager";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize Discord bot if token is provided
  // Discord bot will use the same WebSocket manager from routes
  log("🔍 Checking Discord bot token...");
  if (process.env.DISCORD_BOT_TOKEN) {
    log("✅ Discord bot token found, will initialize after server starts...");
  } else {
    log("⚠️ DISCORD_BOT_TOKEN not found, Discord bot will not start");
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Clean shutdown handling to prevent port conflicts
  const shutdown = async () => {
    log('🛑 Shutting down server gracefully...');
    
    // Discord 봇 정리
    if ((global as any).discordBot) {
      try {
        await (global as any).discordBot.destroy();
        log('✅ Discord bot disconnected');
      } catch (error) {
        log(`⚠️ Discord bot cleanup error: ${error}`);
      }
    }
    
    // 서버 정리
    server.close(() => {
      log('✅ Server closed');
      process.exit(0);
    });

    // 강제 종료 타이머 (10초 후)
    setTimeout(() => {
      log('⚠️ Force exiting process...');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGUSR2', shutdown); // nodemon restart용
  process.on('exit', () => {
    log('👋 Process exiting...');
  });

  // 처리되지 않은 예외 처리
  process.on('uncaughtException', (err) => {
    log(`💥 Uncaught Exception: ${err}`);
    shutdown();
  });

  process.on('unhandledRejection', (reason, promise) => {
    log(`💥 Unhandled Rejection at: ${promise}, reason: ${reason}`);
    // 프로세스를 종료하지 않고 로그만 기록
  });

  // Handle port already in use error
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      log(`❌ Port ${port} is already in use. Trying to kill existing process...`);
      setTimeout(() => {
        log('🔄 Retrying server start...');
        server.listen({
          port,
          host: "0.0.0.0",
          reusePort: true,
        }, () => {
          log(`✅ Server successfully started on port ${port}`);
        });
      }, 2000);
    } else {
      log(`❌ Server error: ${err}`);
      throw err;
    }
  });

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
