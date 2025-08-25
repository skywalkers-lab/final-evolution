import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface PortfolioProps {
  guildId: string;
  userId: string;
}

export default function Portfolio({ guildId, userId }: PortfolioProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [totalValue, setTotalValue] = useState(0);
  const [profitLoss, setProfitLoss] = useState(0);
  const [isTrading, setIsTrading] = useState<string | null>(null);

  const { data: portfolio, refetch } = useQuery({
    queryKey: [`/api/web-client/guilds/${guildId}/portfolio`],
    enabled: !!guildId,
  });

  const { data: accountData, refetch: refetchAccount } = useQuery({
    queryKey: [`/api/web-client/guilds/${guildId}/account`],
    enabled: !!guildId,
  });

  // WebSocket handler for real-time portfolio updates
  useWebSocket((event: string, data: any) => {
    if (event === 'stock_price_updated' || event === 'trade_executed') {
      refetch();
    } else if (event === 'account_deleted') {
      // Refetch both portfolio and account data
      refetch();
      refetchAccount();
      
      // Show notification about account deletion
      toast({
        title: "계좌 삭제됨",
        description: `${data.username}님의 계좌(${data.accountCode})가 관리자에 의해 삭제되었습니다.`,
        variant: "destructive",
      });
      
      console.log('계좌가 삭제되었습니다:', data);
    } else if (event === 'factory_reset') {
      // Refetch both portfolio and account data after factory reset
      refetch();
      refetchAccount();
      
      // Show notification about factory reset
      toast({
        title: "공장초기화 완료",
        description: "모든 데이터가 초기화되었습니다. 새로운 계좌를 개설하세요.",
        variant: "default",
      });
      
      console.log('공장초기화가 완료되었습니다:', data);
    }
  });

  useEffect(() => {
    if (portfolio) {
      setTotalValue((portfolio as any).totalValue || 0);
      // Calculate profit/loss based on holdings
      const holdings = (portfolio as any).holdings || [];
      let totalPL = 0;
      holdings.forEach((holding: any) => {
        const currentValue = holding.currentPrice * holding.shares;
        const originalValue = holding.avgPrice * holding.shares;
        totalPL += currentValue - originalValue;
      });
      setProfitLoss(totalPL);
    }
  }, [portfolio]);

  const formatProfitLoss = (amount: number, percentage: number) => {
    const isPositive = amount >= 0;
    return (
      <div className="flex items-center space-x-1">
        <span className={isPositive ? 'text-red-500' : 'text-blue-500'}>
          {isPositive ? '+' : ''}{percentage.toFixed(1)}%
        </span>
        <span className={`text-xs ${isPositive ? 'text-red-500' : 'text-blue-500'}`}>
          ({isPositive ? '+' : ''}₩{Math.abs(amount).toLocaleString()})
        </span>
      </div>
    );
  };

  const executeTrade = async (symbol: string, type: 'buy' | 'sell', currentPrice: number) => {
    const tradeKey = `${symbol}-${type}`;
    if (isTrading === tradeKey) return; // 이미 거래 중인 경우 무시

    setIsTrading(tradeKey);
    try {
      const tradeData = {
        userId,
        symbol,
        type,
        shares: 1, // 1주씩 거래
        price: currentPrice,
        orderType: 'market'
      };

      await apiRequest('POST', `/api/web-client/guilds/${guildId}/trades`, tradeData);

      // 성공 토스트
      toast({
        title: type === 'buy' ? "매수 완료" : "매도 완료",
        description: `${symbol} 1주를 ₩${currentPrice.toLocaleString()}에 ${type === 'buy' ? '매수' : '매도'}했습니다.`,
        variant: "default",
      });

      // 포트폴리오와 계좌 정보 다시 로드
      refetch();
      refetchAccount();
      
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: ['/api/web-client/guilds', guildId, 'portfolio']
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/web-client/guilds', guildId, 'account']
      });

    } catch (error: any) {
      // 에러 토스트
      toast({
        title: "거래 실패",
        description: error.message || `${type === 'buy' ? '매수' : '매도'} 중 오류가 발생했습니다.`,
        variant: "destructive",
      });
    } finally {
      setIsTrading(null);
    }
  };

  const holdings = (portfolio as any)?.holdings || [];

  return (
    <div className="discord-bg-darker rounded-xl border border-discord-dark">
      <div className="p-6 border-b border-discord-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-white">내 포트폴리오</h3>
            {(accountData as any)?.account ? (
              <div className="text-sm bg-discord-dark px-3 py-1 rounded-full" data-testid="text-account-number">
                <span className="text-gray-400">계좌번호: </span>
                <span className="text-white font-mono">{(accountData as any).account.uniqueCode}</span>
              </div>
            ) : (
              <div className="text-sm bg-red-900/20 text-red-400 px-3 py-1 rounded-full border border-red-800" data-testid="text-no-account">
                계좌없음
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {(accountData as any)?.account ? (
              <>
                <div className="text-sm text-gray-400">
                  <span>총 평가액: </span>
                  <span className="text-white font-medium" data-testid="text-portfolio-value">
                    ₩{totalValue.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm" data-testid="text-portfolio-change">
                  {formatProfitLoss(profitLoss, (profitLoss / Math.max(totalValue - profitLoss, 1)) * 100)}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-400" data-testid="text-no-portfolio">
                계좌를 개설해주세요
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {holdings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400">
                  <th className="pb-3">종목명</th>
                  <th className="pb-3">보유량</th>
                  <th className="pb-3">평균단가</th>
                  <th className="pb-3">현재가</th>
                  <th className="pb-3">평가액</th>
                  <th className="pb-3">손익률</th>
                  <th className="pb-3">액션</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {holdings.map((holding: any, index: number) => {
                  const currentValue = holding.currentPrice * holding.shares;
                  const originalValue = holding.avgPrice * holding.shares;
                  const profitAmount = currentValue - originalValue;
                  const profitPercent = ((currentValue - originalValue) / originalValue) * 100;
                  
                  return (
                    <tr key={holding.symbol} className="border-t border-discord-dark" data-testid={`row-holding-${index}`}>
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-discord-dark border border-discord-light flex items-center justify-center">
                            {holding.logoUrl ? (
                              <img 
                                src={holding.logoUrl} 
                                alt={`${holding.symbol} 로고`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // 로고 로드 실패 시 fallback
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const nextElement = target.nextElementSibling as HTMLElement;
                                  if (nextElement) nextElement.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full bg-discord-blue rounded-full flex items-center justify-center text-xs font-bold text-white ${holding.logoUrl ? 'hidden' : ''}`}>
                              {holding.symbol.substring(0, 2)}
                            </div>
                          </div>
                          <div>
                            <p className="text-white font-medium" data-testid={`text-holding-symbol-${index}`}>
                              {holding.symbol}
                            </p>
                            <p className="text-gray-400 text-xs" data-testid={`text-holding-name-${index}`}>
                              {holding.name || holding.symbol}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-white" data-testid={`text-holding-shares-${index}`}>
                        {holding.shares.toLocaleString()}주
                      </td>
                      <td className="py-4 text-green-400 font-semibold" data-testid={`text-holding-avg-price-${index}`}>
                        ₩{Number(holding.avgPrice).toLocaleString()}
                      </td>
                      <td className="py-4 text-white" data-testid={`text-holding-current-price-${index}`}>
                        ₩{Number(holding.currentPrice).toLocaleString()}
                      </td>
                      <td className="py-4 text-white font-medium" data-testid={`text-holding-market-value-${index}`}>
                        ₩{currentValue.toLocaleString()}
                      </td>
                      <td className="py-4" data-testid={`text-holding-profit-loss-${index}`}>
                        {formatProfitLoss(profitAmount, profitPercent)}
                      </td>
                      <td className="py-4">
                        <div className="flex space-x-1">
                          <Button 
                            size="sm"
                            className="bg-discord-blue hover:bg-blue-600 text-white px-3 py-1 text-xs disabled:opacity-50"
                            data-testid={`button-buy-more-${index}`}
                            disabled={isTrading === `${holding.symbol}-buy`}
                            onClick={() => executeTrade(holding.symbol, 'buy', holding.currentPrice)}
                          >
                            {isTrading === `${holding.symbol}-buy` ? '매수중...' : '매수'}
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-discord-red hover:bg-red-600 text-white px-3 py-1 text-xs disabled:opacity-50"
                            data-testid={`button-sell-holding-${index}`}
                            disabled={isTrading === `${holding.symbol}-sell` || holding.shares <= 0}
                            onClick={() => executeTrade(holding.symbol, 'sell', holding.currentPrice)}
                          >
                            {isTrading === `${holding.symbol}-sell` ? '매도중...' : '매도'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            보유 중인 주식이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
