import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";

interface AuctionCardProps {
  auction: any;
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [showBidInput, setShowBidInput] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate time remaining
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(auction.endsAt).getTime();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remaining);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [auction.endsAt]);

  // WebSocket handler for auction updates
  useWebSocket((event: string, data: any) => {
    if (event === 'auction_bid' && data.auctionId === auction.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/guilds'] });
    }
  });

  const bidMutation = useMutation({
    mutationFn: async (amount: number) => {
      return await apiRequest('POST', `/api/auctions/${auction.id}/bid`, {
        userId: 'web-client',
        amount,
      });
    },
    onSuccess: () => {
      toast({
        title: "입찰 성공",
        description: "입찰이 성공적으로 접수되었습니다.",
      });
      setBidAmount('');
      setShowBidInput(false);
      queryClient.invalidateQueries({ queryKey: ['/api/guilds'] });
    },
    onError: (error: any) => {
      toast({
        title: "입찰 실패",
        description: error.message || "입찰 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const buyoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/auctions/${auction.id}/bid`, {
        userId: 'web-client',
        amount: Number(auction.buyoutPrice),
      });
    },
    onSuccess: () => {
      toast({
        title: "즉시구매 성공",
        description: "즉시구매가 완료되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/guilds'] });
    },
    onError: (error: any) => {
      toast({
        title: "즉시구매 실패",
        description: error.message || "즉시구매 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleBid = () => {
    const amount = parseFloat(bidAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "입력 오류",
        description: "올바른 입찰 금액을 입력하세요.",
        variant: "destructive",
      });
      return;
    }

    bidMutation.mutate(amount);
  };

  const handleBuyout = () => {
    if (window.confirm('즉시구매를 진행하시겠습니까?')) {
      buyoutMutation.mutate();
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (timeLeft <= 0) return 'bg-gray-600';
    if (timeLeft <= 300) return 'bg-orange-600'; // 5 minutes
    return 'bg-green-600';
  };

  const getStatusText = () => {
    if (timeLeft <= 0) return '종료됨';
    if (timeLeft <= 300) return '마감 임박';
    return '진행중';
  };

  return (
    <div className="bg-discord-dark rounded-lg p-4" data-testid={`auction-card-${auction.id.slice(0, 8)}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-white" data-testid="text-auction-item">
            {auction.itemRef}
          </h4>
          <p className="text-sm text-gray-400" data-testid="text-auction-seller">
            판매자: {auction.sellerUserId || '시스템'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">최고가</p>
          <p className="text-lg font-bold text-discord-gold" data-testid="text-auction-current-bid">
            ₩{Number(auction.currentBid || auction.startPrice).toLocaleString()}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <span className="text-gray-400">시작가:</span>
          <span className="text-white ml-2" data-testid="text-auction-start-price">
            ₩{Number(auction.startPrice).toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-gray-400">입찰자:</span>
          <span className="text-white ml-2" data-testid="text-auction-bidder-count">
            {auction.bidderCount || 0}명
          </span>
        </div>
        {auction.minIncrementAbs && (
          <div>
            <span className="text-gray-400">최소증분:</span>
            <span className="text-white ml-2" data-testid="text-auction-min-increment">
              ₩{Number(auction.minIncrementAbs).toLocaleString()}
            </span>
          </div>
        )}
        {auction.buyoutPrice && (
          <div>
            <span className="text-gray-400">즉시구매:</span>
            <span className="text-discord-gold ml-2" data-testid="text-auction-buyout-price">
              ₩{Number(auction.buyoutPrice).toLocaleString()}
            </span>
          </div>
        )}
      </div>
      
      {/* Time remaining */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <i className="fas fa-clock text-gray-400"></i>
          <span className="text-sm text-gray-400">남은 시간:</span>
          <span className="text-white font-mono" data-testid="text-auction-time-remaining">
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className={`px-2 py-1 rounded text-xs text-white ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>
      
      {/* Bid input */}
      {showBidInput && (
        <div className="mb-4">
          <Input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder="입찰 금액"
            className="bg-discord-darker border-discord-dark text-white mb-2"
            data-testid="input-bid-amount"
          />
        </div>
      )}
      
      {/* Action buttons */}
      {timeLeft > 0 && auction.status === 'live' && (
        <div className="flex space-x-2">
          {!showBidInput ? (
            <Button 
              onClick={() => setShowBidInput(true)}
              className="flex-1 bg-discord-blue hover:bg-blue-600 text-white text-sm font-medium"
              data-testid="button-show-bid-input"
            >
              입찰하기
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleBid}
                disabled={bidMutation.isPending}
                className="flex-1 bg-discord-blue hover:bg-blue-600 text-white text-sm font-medium"
                data-testid="button-place-bid"
              >
                {bidMutation.isPending ? '처리중...' : '입찰 확정'}
              </Button>
              <Button 
                onClick={() => setShowBidInput(false)}
                variant="outline"
                className="px-3 text-gray-400 border-discord-dark hover:bg-discord-darker"
                data-testid="button-cancel-bid"
              >
                취소
              </Button>
            </>
          )}
          
          {auction.buyoutPrice && (
            <Button 
              onClick={handleBuyout}
              disabled={buyoutMutation.isPending}
              className="flex-1 bg-discord-gold hover:bg-yellow-500 text-black text-sm font-medium"
              data-testid="button-buyout"
            >
              {buyoutMutation.isPending ? '처리중...' : '즉시구매'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
