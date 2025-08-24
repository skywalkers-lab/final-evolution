import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";

interface MarketOverviewProps {
  stocks: any[];
}

export default function MarketOverview({ stocks }: MarketOverviewProps) {
  const [sortBy, setSortBy] = useState<'change' | 'volume' | 'price'>('change');

  // WebSocket handler for real-time price updates
  useWebSocket((event: string, data: any) => {
    if (event === 'stock_price_updated') {
      // Stock price updates are handled by parent component refetch
    }
  });

  const getSortedStocks = () => {
    const sortedStocks = [...stocks].sort((a, b) => {
      switch (sortBy) {
        case 'change':
          // Calculate percentage change (mock for now)
          return Math.random() - 0.5;
        case 'volume':
          return Math.random() - 0.5;
        case 'price':
          return Number(b.price) - Number(a.price);
        default:
          return 0;
      }
    });
    return sortedStocks.slice(0, 5);
  };

  const getStockIcon = (symbol: string, logoUrl?: string) => {
    // Generate consistent color based on symbol as fallback
    const colors = ['bg-discord-blue', 'bg-blue-600', 'bg-orange-600', 'bg-red-600', 'bg-green-600', 'bg-purple-600'];
    const index = symbol.charCodeAt(0) % colors.length;
    return logoUrl ? null : colors[index];
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-discord-green' : 'text-discord-red';
  };

  // Mock change data for display
  const getMockChange = (symbol: string) => {
    const hash = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const change = ((hash % 100) - 50) / 10; // -5% to +5%
    return change;
  };

  const sortedStocks = getSortedStocks();

  return (
    <div className="discord-bg-darker rounded-xl border border-discord-dark">
      <div className="p-6 border-b border-discord-dark">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">시장 현황</h3>
          <div className="flex space-x-2">
            <Button
              variant={sortBy === 'change' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('change')}
              className={sortBy === 'change' ? 'bg-discord-blue text-white' : 'text-gray-400 hover:text-white'}
              data-testid="button-sort-change"
            >
              상승률
            </Button>
            <Button
              variant={sortBy === 'volume' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('volume')}
              className={sortBy === 'volume' ? 'bg-discord-blue text-white' : 'text-gray-400 hover:text-white'}
              data-testid="button-sort-volume"
            >
              거래량
            </Button>
            <Button
              variant={sortBy === 'price' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('price')}
              className={sortBy === 'price' ? 'bg-discord-blue text-white' : 'text-gray-400 hover:text-white'}
              data-testid="button-sort-price"
            >
              가격
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {sortedStocks.length > 0 ? (
          <div className="space-y-3">
            {sortedStocks.map((stock, index) => {
              const change = getMockChange(stock.symbol);
              const price = Number(stock.price);
              
              return (
                <div 
                  key={stock.symbol}
                  className="flex items-center justify-between p-3 bg-discord-dark rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                  data-testid={`stock-item-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    {stock.logoUrl ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                        <img 
                          src={stock.logoUrl} 
                          alt={`${stock.symbol} logo`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to colored icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="${getStockIcon(stock.symbol)} w-full h-full rounded-full flex items-center justify-center text-sm font-bold text-white">${stock.symbol.substring(0, 2)}</div>`;
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className={`w-8 h-8 ${getStockIcon(stock.symbol)} rounded-full flex items-center justify-center text-sm font-bold text-white`}>
                        {stock.symbol.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white" data-testid={`text-stock-symbol-${index}`}>
                        {stock.symbol}
                      </p>
                      <p className="text-xs text-gray-400" data-testid={`text-stock-name-${index}`}>
                        {stock.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white" data-testid={`text-stock-price-${index}`}>
                      ₩{price.toLocaleString()}
                    </p>
                    <div className="flex items-center space-x-1">
                      <span className={`text-sm ${getChangeColor(change)}`} data-testid={`text-stock-change-${index}`}>
                        {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                      </span>
                      <i className={`${getChangeIcon(change)} ${getChangeColor(change)} text-xs`}></i>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            상장된 주식이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
