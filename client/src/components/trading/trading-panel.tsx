import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";

interface TradingPanelProps {
  selectedStock: string;
  guildId: string;
  stocks: any[];
}

export default function TradingPanel({ selectedStock, guildId, stocks }: TradingPanelProps) {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [realtimePrice, setRealtimePrice] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedStockData = stocks.find(s => s.symbol === selectedStock);

  const { data: portfolio, refetch: refetchPortfolio } = useQuery({
    queryKey: ['/api/web-client/guilds', guildId, 'portfolio'],
    enabled: !!guildId,
  });

  // WebSocket handler for real-time updates
  useWebSocket((event: string, data: any) => {
    switch (event) {
      case 'stock_price_updated':
        if (data.symbol === selectedStock) {
          setRealtimePrice(data.newPrice);
          if (orderType === 'limit') {
            setPrice(data.newPrice.toString());
          }
        }
        break;
      case 'trade_executed':
      case 'account_updated':
        // Refetch portfolio when trades are executed or account is updated
        refetchPortfolio();
        break;
    }
  });
  
  // Set current price when stock changes
  useEffect(() => {
    if (selectedStockData) {
      const currentPrice = realtimePrice || Number(selectedStockData.price);
      setPrice(currentPrice.toString());
      setRealtimePrice(null); // Clear realtime price after setting
    }
  }, [selectedStockData, realtimePrice]);

  const tradeMutation = useMutation({
    mutationFn: async (tradeData: any) => {
      return await apiRequest('POST', `/api/web-client/guilds/${guildId}/trades`, tradeData);
    },
    onSuccess: () => {
      toast({
        title: "거래 성공",
        description: `${tradeType === 'buy' ? '매수' : '매도'} 주문이 체결되었습니다.`,
      });
      setQuantity('');
      // Refetch portfolio and overview
      queryClient.invalidateQueries({ queryKey: ['/api/guilds', guildId, 'users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guilds', guildId, 'overview'] });
    },
    onError: (error: any) => {
      toast({
        title: "거래 실패",
        description: error.message || "거래 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleTrade = () => {
    if (!selectedStock || !quantity || !price) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const quantityNum = parseInt(quantity);
    const priceNum = parseFloat(price);

    if (quantityNum <= 0 || priceNum <= 0) {
      toast({
        title: "입력 오류",
        description: "수량과 가격은 0보다 커야 합니다.",
        variant: "destructive",
      });
      return;
    }

    tradeMutation.mutate({
      symbol: selectedStock,
      type: tradeType,
      shares: quantityNum,
      price: priceNum,
    });
  };

  const calculateOrderAmount = () => {
    const quantityNum = parseInt(quantity) || 0;
    const priceNum = parseFloat(price) || 0;
    return quantityNum * priceNum;
  };

  const calculateFee = (amount: number) => {
    return Math.floor(amount * 0.001); // 0.1% fee
  };

  const orderAmount = calculateOrderAmount();
  const fee = calculateFee(orderAmount);
  const totalRequired = orderAmount + fee;

  const availableBalance = Number((portfolio as any)?.account?.balance || 0);
  const holding = portfolio?.holdings?.find((h: any) => h.symbol === selectedStock);
  const availableShares = holding?.shares || 0;

  const canTrade = () => {
    if (!selectedStockData || selectedStockData.status !== 'active') return false;
    if (tradeType === 'buy') {
      return availableBalance >= totalRequired;
    } else {
      return availableShares >= parseInt(quantity || '0');
    }
  };

  return (
    <div className="discord-bg-darker rounded-xl border border-discord-dark">
      <div className="p-6 border-b border-discord-dark">
        <h3 className="text-lg font-semibold text-white">주식 거래</h3>
        <p className="text-sm text-gray-400">실시간 매수/매도</p>
      </div>
      
      <div className="p-6">
        {/* Trade Type Tabs */}
        <div className="flex bg-discord-dark rounded-lg p-1 mb-6">
          <Button
            variant={tradeType === 'buy' ? 'default' : 'ghost'}
            onClick={() => setTradeType('buy')}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium ${
              tradeType === 'buy' 
                ? 'bg-discord-green text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
            data-testid="button-trade-buy"
          >
            매수
          </Button>
          <Button
            variant={tradeType === 'sell' ? 'default' : 'ghost'}
            onClick={() => setTradeType('sell')}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium ${
              tradeType === 'sell' 
                ? 'bg-discord-red text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
            data-testid="button-trade-sell"
          >
            매도
          </Button>
        </div>

        {selectedStockData ? (
          <div className="space-y-4">
            {/* Selected Stock Info */}
            <div className="bg-discord-dark rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{selectedStockData.name}</p>
                  <p className="text-gray-400 text-sm">{selectedStockData.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">₩{Number(selectedStockData.price).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">현재가</p>
                </div>
              </div>
            </div>

            {/* Order Form */}
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">주문 수량</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                className="w-full bg-discord-dark border-discord-dark text-white placeholder-gray-500"
                data-testid="input-quantity"
              />
              {tradeType === 'sell' && (
                <p className="text-xs text-gray-400 mt-1">
                  보유 수량: {availableShares.toLocaleString()}주
                </p>
              )}
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">주문 가격</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="0.01"
                  className="w-full bg-discord-dark border-discord-dark text-white pr-16"
                  data-testid="input-price"
                />
                <span className="absolute right-4 top-3 text-gray-400">원</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {realtimePrice ? (
                  <span className="text-orange-400">실시간: ₩{realtimePrice.toLocaleString()}</span>
                ) : (
                  `현재가: ₩${Number(selectedStockData.price).toLocaleString()}`
                )}
              </p>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">주문 방식</Label>
              <Select value={orderType} onValueChange={(value: 'market' | 'limit') => setOrderType(value)}>
                <SelectTrigger className="w-full bg-discord-dark border-discord-dark text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-discord-dark border-discord-dark">
                  <SelectItem value="limit" className="text-white hover:bg-discord-darker">지정가</SelectItem>
                  <SelectItem value="market" className="text-white hover:bg-discord-darker">시장가</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Summary */}
            <div className="bg-discord-dark rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">주문 금액:</span>
                <span className="text-white" data-testid="text-order-amount">₩{orderAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">수수료:</span>
                <span className="text-white" data-testid="text-order-fee">₩{fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t border-discord-dark pt-2">
                <span className="text-gray-300">총 {tradeType === 'buy' ? '필요' : '수령'} 금액:</span>
                <span className="text-white" data-testid="text-total-amount">₩{totalRequired.toLocaleString()}</span>
              </div>
            </div>

            {/* Available Balance */}
            <div className="bg-discord-blue bg-opacity-10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">
                  {tradeType === 'buy' ? '사용 가능 잔액:' : '보유 수량:'}
                </span>
                <span className="text-white font-medium" data-testid="text-available-balance">
                  {tradeType === 'buy' 
                    ? `₩${availableBalance.toLocaleString()}`
                    : `${availableShares.toLocaleString()}주`
                  }
                </span>
              </div>
            </div>

            {/* Order Button */}
            <Button 
              onClick={handleTrade}
              disabled={!canTrade() || tradeMutation.isPending}
              className={`w-full font-bold py-3 rounded-lg transition-colors ${
                tradeType === 'buy'
                  ? 'bg-discord-green hover:bg-green-600 text-white'
                  : 'bg-discord-red hover:bg-red-600 text-white'
              }`}
              data-testid="button-submit-order"
            >
              {tradeMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  처리 중...
                </div>
              ) : (
                `${tradeType === 'buy' ? '매수' : '매도'} 주문`
              )}
            </Button>

            {selectedStockData.status !== 'active' && (
              <div className="bg-yellow-600 bg-opacity-20 border border-yellow-600 rounded-lg p-3">
                <p className="text-yellow-400 text-sm text-center">
                  {selectedStockData.status === 'halted' ? '거래가 중지된 종목입니다' : '상장폐지된 종목입니다'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            거래할 종목을 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
