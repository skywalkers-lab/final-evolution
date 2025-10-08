import 'express-session';

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