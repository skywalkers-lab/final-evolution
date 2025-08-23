import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    discordId: string;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        discordId: string;
      };
    }
  }
}