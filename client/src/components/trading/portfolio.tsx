import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { useState, useEffect } from "react";

interface PortfolioProps {
  guildId: string;
  userId: string;
}

export default function Portfolio({ guildId, userId }: PortfolioProps) {
  const [totalValue, setTotalValue] = useState(0);
  const [profitLoss, setProfitLoss] = useState(0);

  const { data: portfolio, refetch } = useQuery({
    queryKey: ['/api/guilds', guildId, 'users', userId, 'portfolio'],
    enabled: !!guildId && !!userId,
  });

  const { data: accountData } = useQuery({
    queryKey: ['/api/guilds', guildId, 'users', userId, 'account'],
    enabled: !!guildId && !!userId,
  });

  // WebSocket handler for real-time portfolio updates
  useWebSocket((event: string, data: any) => {
    if (event === 'stock_price_updated' || event === 'trade_executed') {
      refetch();
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
        <span className={isPositive ? 'text-discord-green' : 'text-discord-red'}>
          {isPositive ? '+' : ''}{percentage.toFixed(1)}%
        </span>
        <span className={`text-xs ${isPositive ? 'text-discord-green' : 'text-discord-red'}`}>
          ({isPositive ? '+' : ''}₩{Math.abs(amount).toLocaleString()})
        </span>
      </div>
    );
  };

  const holdings = (portfolio as any)?.holdings || [];

  return (
    <div className="discord-bg-darker rounded-xl border border-discord-dark">
      <div className="p-6 border-b border-discord-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-white">내 포트폴리오</h3>
            {(accountData as any)?.account && (
              <div className="text-sm bg-discord-dark px-3 py-1 rounded-full" data-testid="text-account-number">
                <span className="text-gray-400">계좌번호: </span>
                <span className="text-white font-mono">{(accountData as any).account.uniqueCode}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              <span>총 평가액: </span>
              <span className="text-white font-medium" data-testid="text-portfolio-value">
                ₩{totalValue.toLocaleString()}
              </span>
            </div>
            <div className="text-sm" data-testid="text-portfolio-change">
              {formatProfitLoss(profitLoss, (profitLoss / Math.max(totalValue - profitLoss, 1)) * 100)}
            </div>
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
                          <div className="w-8 h-8 bg-discord-blue rounded-full flex items-center justify-center text-xs font-bold">
                            {holding.symbol.substring(0, 2)}
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
                      <td className="py-4 text-white" data-testid={`text-holding-avg-price-${index}`}>
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
                            className="bg-discord-blue hover:bg-blue-600 text-white px-3 py-1 text-xs"
                            data-testid={`button-buy-more-${index}`}
                          >
                            매수
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-discord-red hover:bg-red-600 text-white px-3 py-1 text-xs"
                            data-testid={`button-sell-holding-${index}`}
                          >
                            매도
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
