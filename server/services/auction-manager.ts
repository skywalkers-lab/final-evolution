import { IStorage } from '../storage';
import { WebSocketManager } from './websocket-manager';

export class AuctionManager {
  private storage: IStorage;
  private wsManager: WebSocketManager;
  private auctionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(storage: IStorage, wsManager: WebSocketManager) {
    this.storage = storage;
    this.wsManager = wsManager;
  }

  start() {
    // Resume existing live auctions
    this.resumeLiveAuctions();
    console.log('Auction manager started');
  }

  stop() {
    // Clear all timers
    this.auctionTimers.forEach(timer => clearTimeout(timer));
    this.auctionTimers.clear();
  }

  async createAuction(auctionData: any) {
    const auction = await this.storage.createAuction({
      ...auctionData,
      status: 'live',
      startedAt: new Date(),
    });

    // Set up timer for auction end
    this.scheduleAuctionEnd(auction);

    // Broadcast auction started
    this.wsManager.broadcast('auction_started', auction);

    return auction;
  }

  async placeBid(auctionId: string, userId: string, amount: number) {
    const auction = await this.storage.getAuctionById(auctionId);
    if (!auction) {
      throw new Error('경매를 찾을 수 없습니다');
    }

    if (auction.status !== 'live') {
      throw new Error('진행중이지 않은 경매입니다');
    }

    if (new Date() >= new Date(auction.endsAt)) {
      throw new Error('이미 종료된 경매입니다');
    }

    // Check account and balance
    const account = await this.storage.getAccountByUser(auction.guildId, userId);
    if (!account) {
      throw new Error('계좌를 찾을 수 없습니다');
    }

    if (account.frozen) {
      throw new Error('계좌가 동결되어 입찰할 수 없습니다');
    }

    // Get current highest bid
    const topBid = await this.storage.getTopBid(auctionId);
    const minBidAmount = topBid ? Number(topBid.amount) : Number(auction.startPrice);

    // Calculate minimum increment
    let requiredBid = minBidAmount;
    if (auction.minIncrementAbs) {
      requiredBid += Number(auction.minIncrementAbs);
    } else if (auction.minIncrementPct) {
      requiredBid += minBidAmount * (Number(auction.minIncrementPct) / 100);
    } else {
      // Default 1% increment
      requiredBid += minBidAmount * 0.01;
    }

    if (amount < requiredBid) {
      throw new Error(`최소 입찰 금액은 ₩${Math.ceil(requiredBid).toLocaleString()}입니다`);
    }

    // Check balance (including escrow)
    const currentBalance = Number(account.balance);
    if (currentBalance - amount < 1) {
      throw new Error('잔액이 부족합니다 (입찰 후 최소 1원이 남아있어야 합니다)');
    }

    // Place bid with escrow
    const result = await this.storage.placeBidWithEscrow(auction.guildId, auctionId, userId, amount);

    // Check for auto-extension
    const timeLeft = new Date(auction.endsAt).getTime() - Date.now();
    if (auction.extendSeconds && timeLeft < auction.extendSeconds * 1000) {
      const newEndTime = new Date(Date.now() + auction.extendSeconds * 1000);
      await this.storage.extendAuction(auctionId, newEndTime);
      
      // Reschedule timer
      this.scheduleAuctionEnd({ ...auction, endsAt: newEndTime });
      
      this.wsManager.broadcast('auction_extended', {
        auctionId,
        newEndTime,
        extendedBy: auction.extendSeconds
      });
    }

    // Check for buyout
    if (auction.buyoutPrice && amount >= Number(auction.buyoutPrice)) {
      await this.endAuction(auctionId, 'buyout');
    }

    // Broadcast bid placed
    this.wsManager.broadcast('auction_bid', {
      auctionId,
      bidderUserId: userId,
      amount,
      isTopBid: true
    });

    return result;
  }

  async endAuction(auctionId: string, reason: 'completed' | 'canceled' | 'buyout' = 'completed') {
    const auction = await this.storage.getAuctionById(auctionId);
    if (!auction) {
      throw new Error('경매를 찾을 수 없습니다');
    }

    // Clear timer
    const timer = this.auctionTimers.get(auctionId);
    if (timer) {
      clearTimeout(timer);
      this.auctionTimers.delete(auctionId);
    }

    if (reason === 'canceled') {
      // Release all escrows
      await this.storage.releaseAllEscrows(auctionId);
      await this.storage.updateAuctionStatus(auctionId, 'canceled');
      
      this.wsManager.broadcast('auction_canceled', { auctionId, reason });
      return;
    }

    // Get winning bid
    const winningBid = await this.storage.getTopBid(auctionId);
    
    if (winningBid) {
      // Settle auction - capture winner's escrow, release others
      await this.storage.settleAuction(auctionId, winningBid.bidderUserId);
      
      // Transfer item (if stock)
      if (auction.itemType === 'stock') {
        const [symbol, quantity] = auction.itemRef.split(':');
        if (symbol && quantity) {
          // Transfer stock to winner
          await this.storage.transferStock(
            auction.guildId, 
            auction.sellerUserId || 'system', 
            winningBid.bidderUserId, 
            symbol, 
            parseInt(quantity)
          );
        }
      }

      this.wsManager.broadcast('auction_settled', {
        auctionId,
        winnerId: winningBid.bidderUserId,
        winningAmount: winningBid.amount,
        item: auction.itemRef
      });
    } else {
      // No bids - just end auction
      await this.storage.updateAuctionStatus(auctionId, 'ended');
    }

    await this.storage.updateAuctionStatus(auctionId, 'ended');
  }

  private async resumeLiveAuctions() {
    try {
      const liveAuctions = await this.storage.getAllLiveAuctions();
      
      for (const auction of liveAuctions) {
        const timeLeft = new Date(auction.endsAt).getTime() - Date.now();
        
        if (timeLeft <= 0) {
          // Auction should have ended
          await this.endAuction(auction.id);
        } else {
          // Schedule end
          this.scheduleAuctionEnd(auction);
        }
      }
    } catch (error) {
      console.error('Error resuming live auctions:', error);
    }
  }

  private scheduleAuctionEnd(auction: any) {
    // Clear existing timer
    const existingTimer = this.auctionTimers.get(auction.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timeLeft = new Date(auction.endsAt).getTime() - Date.now();
    
    if (timeLeft > 0) {
      const timer = setTimeout(async () => {
        await this.endAuction(auction.id);
        this.auctionTimers.delete(auction.id);
      }, timeLeft);
      
      this.auctionTimers.set(auction.id, timer);
    }
  }
}
