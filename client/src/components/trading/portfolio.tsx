import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { formatKoreanCurrency } from "@/utils/formatCurrency";

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

  // Debounced refetch to prevent race conditions
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    
    refetchTimeoutRef.current = setTimeout(() => {
      refetch();
    }, 500); // 500ms delay to batch rapid updates
  }, [refetch]);

  // WebSocket handler for real-time portfolio updates
  useWebSocket((event: string, data: any) => {
    if (event === 'stock_price_updated' || event === 'trade_executed') {
      debouncedRefetch(); // Use debounced refetch for frequent events
    } else if (event === 'account_deleted') {
      // Refetch both portfolio and account data immediately for critical events
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, []);

  const formatProfitLoss = (amount: number, percentage: number) => {
    const isPositive = amount >= 0;
    return (
      <div className="flex items-center space-x-1">
        <span className={isPositive ? 'text-red-500' : 'text-blue-500'}>
          {isPositive ? '+' : ''}{percentage.toFixed(1)}%
        </span>
        <span className={`text-xs ${isPositive ? 'text-red-500' : 'text-blue-500'}`}>
          ({isPositive ? '+' : ''}{formatKoreanCurrency(Math.abs(amount))})
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
        description: `${symbol} 1주를 ${formatKoreanCurrency(currentPrice)}에 ${type === 'buy' ? '매수' : '매도'}했습니다.`,
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-1.5 border-b border-discord-dark flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5">
            <h3 className="text-[10px] font-semibold text-white">포트폴리오</h3>
            {(accountData as any)?.account ? (
              <div className="text-[9px] bg-discord-dark px-1 py-0.5 rounded" data-testid="text-account-number">
                <span className="text-gray-400">계좌: </span>
                <span className="text-white font-mono text-[8px]">{(accountData as any).account.uniqueCode}</span>
              </div>
            ) : (
              <div className="text-[9px] bg-red-900/20 text-red-400 px-1 py-0.5 rounded border border-red-800" data-testid="text-no-account">
                계좌없음
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          {(accountData as any)?.account ? (
            <>
              <div className="text-gray-400">
                <span className="text-[9px]">평가: </span>
                <span className="text-white font-medium text-[10px]" data-testid="text-portfolio-value">
                  {formatKoreanCurrency(totalValue)}
                </span>
              </div>
              <div className="text-[10px]" data-testid="text-portfolio-change">
                {formatProfitLoss(profitLoss, (profitLoss / Math.max(totalValue - profitLoss, 1)) * 100)}
              </div>
            </>
          ) : (
            <div className="text-[9px] text-gray-400" data-testid="text-no-portfolio">
              계좌를 개설해주세요
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-1.5 min-h-0">
        {holdings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="text-left text-[9px] text-gray-400">
                  <th className="pb-0.5 font-medium w-20">종목</th>
                  <th className="pb-0.5 text-right font-medium w-14">보유</th>
                  <th className="pb-0.5 text-right font-medium w-16">평단</th>
                  <th className="pb-0.5 text-right font-medium w-16">현재</th>
                  <th className="pb-0.5 text-right font-medium w-20">평가</th>
                  <th className="pb-0.5 text-center font-medium w-16">손익</th>
                  <th className="pb-0.5 text-center font-medium w-16"></th>
                </tr>
              </thead>
              <tbody className="text-[9px]">
                {holdings.map((holding: any, index: number) => {
                  const currentValue = holding.currentPrice * holding.shares;
                  const originalValue = holding.avgPrice * holding.shares;
                  const profitAmount = currentValue - originalValue;
                  const profitPercent = ((currentValue - originalValue) / originalValue) * 100;
                  
                  return (
                    <tr key={holding.symbol} className="border-t border-discord-dark/50" data-testid={`row-holding-${index}`}>
                      <td className="py-1">
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 rounded-full overflow-hidden bg-discord-dark border border-discord-light flex items-center justify-center flex-shrink-0">
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
                            <div className={`w-full h-full bg-discord-blue rounded-full flex items-center justify-center text-[8px] font-bold text-white ${holding.logoUrl ? 'hidden' : ''}`}>
                              {holding.symbol.substring(0, 2)}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium truncate text-[9px]" data-testid={`text-holding-symbol-${index}`}>
                              {holding.symbol}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-1 text-white text-right font-mono" data-testid={`text-holding-shares-${index}`}>
                        {holding.shares.toLocaleString()}
                      </td>
                      <td className="py-1 text-green-400 font-semibold text-right font-mono" data-testid={`text-holding-avg-price-${index}`}>
                        {formatKoreanCurrency(Number(holding.avgPrice))}
                      </td>
                      <td className="py-1 text-white text-right font-mono" data-testid={`text-holding-current-price-${index}`}>
                        {formatKoreanCurrency(Number(holding.currentPrice))}
                      </td>
                      <td className="py-1 text-white font-medium text-right font-mono" data-testid={`text-holding-market-value-${index}`}>
                        {formatKoreanCurrency(currentValue)}
                      </td>
                      <td className="py-1 text-center" data-testid={`text-holding-profit-loss-${index}`}>
                        {formatProfitLoss(profitAmount, profitPercent)}
                      </td>
                      <td className="py-1">
                        <div className="flex gap-0.5 justify-center">
                          <Button 
                            size="sm"
                            className="bg-discord-blue hover:bg-blue-600 text-white px-1 py-0.5 text-[8px] disabled:opacity-50 h-4 leading-none"
                            data-testid={`button-buy-more-${index}`}
                            disabled={isTrading === `${holding.symbol}-buy`}
                            onClick={() => executeTrade(holding.symbol, 'buy', holding.currentPrice)}
                          >
                            {isTrading === `${holding.symbol}-buy` ? '...' : '매수'}
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-discord-red hover:bg-red-600 text-white px-1 py-0.5 text-[8px] disabled:opacity-50 h-4 leading-none"
                            data-testid={`button-sell-holding-${index}`}
                            disabled={isTrading === `${holding.symbol}-sell` || holding.shares <= 0}
                            onClick={() => executeTrade(holding.symbol, 'sell', holding.currentPrice)}
                          >
                            {isTrading === `${holding.symbol}-sell` ? '...' : '매도'}
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
          <div className="text-center text-gray-400 py-4 text-[9px]">
            보유 주식 없음
          </div>
        )}
      </div>
    </div>
  );
}
