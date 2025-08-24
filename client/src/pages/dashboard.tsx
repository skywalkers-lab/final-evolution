import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";
import OverviewCards from "@/components/dashboard/overview-cards";
import StockChart from "@/components/trading/stock-chart";
import TradingPanel from "@/components/trading/trading-panel";
import Portfolio from "@/components/trading/portfolio";
import RecentActivity from "@/components/dashboard/recent-activity";
import AuctionCard from "@/components/auctions/auction-card";
import GuildSelector from "@/components/guild/guild-selector";

export default function Dashboard() {
  const { user, selectedGuildId, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStock, setSelectedStock] = useState<string>('');

  const { data: overview = {}, refetch: refetchOverview } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'overview'],
    enabled: !!selectedGuildId,
  });

  const { data: portfolio } = useQuery({
    queryKey: ['/api/guilds', 'users', 'web-client', 'portfolio'],
    enabled: true,
  });

  const { data: stocks = [] } = useQuery({
    queryKey: ['/api/guilds', selectedGuildId, 'stocks'],
    enabled: !!selectedGuildId,
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ['/api/guilds', selectedGuildId, 'auctions'],
    enabled: !!selectedGuildId,
  });

  // WebSocket handler for real-time updates
  useWebSocket((event: string, data: any) => {
    switch (event) {
      case 'stock_price_updated':
      case 'trade_executed':
      case 'auction_bid':
      case 'auction_settled':
      case 'account_created':
      case 'transfer_completed':
      case 'tax_collected':
        refetchOverview();
        break;
      case 'stock_created':
        console.log('Stock created:', data);
        // Refetch stocks and overview to show the new stock
        refetchOverview();
        window.location.reload(); // Reload to update stock list
        break;
      case 'stock_deleted':
        console.log('Stock deleted:', data);
        // Refetch stocks and overview to remove the deleted stock
        refetchOverview();
        window.location.reload(); // Reload to update stock list
        break;
      case 'account_deleted':
        console.log('Account deleted:', data);
        // Refetch overview to update statistics
        refetchOverview();
        break;
      case 'factory_reset':
        console.log('Factory reset performed:', data);
        // Refetch all data after factory reset
        refetchOverview();
        window.location.reload(); // Full reload to ensure all components refresh
        break;
    }
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    // Set default selected stock
    if (stocks && Array.isArray(stocks) && stocks.length > 0 && !selectedStock) {
      setSelectedStock(stocks[0].symbol);
    }
  }, [stocks, selectedStock]);

  if (isLoading) {
    return (
      <div className="min-h-screen discord-bg-darkest flex items-center justify-center">
        <div className="animate-pulse-discord text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show guild selector if no guild is selected
  if (!selectedGuildId) {
    return <GuildSelector />;
  }

  return (
    <div className="flex h-screen overflow-hidden discord-bg-darkest text-gray-100 font-inter">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <main className="flex-1 overflow-y-auto p-6" data-testid="dashboard-main">
          {/* Overview Cards */}
          <OverviewCards data={overview} portfolio={portfolio} />

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Stock Chart */}
            <div className="lg:col-span-2">
              <StockChart 
                symbol={selectedStock} 
                guildId={selectedGuildId || ''}
                onSymbolChange={setSelectedStock}
                stocks={Array.isArray(stocks) ? stocks : []}
              />
            </div>

            {/* Trading Panel */}
            <div>
              <TradingPanel 
                selectedStock={selectedStock}
                guildId={selectedGuildId || ''}
                stocks={Array.isArray(stocks) ? stocks : []}
              />
            </div>
          </div>

          {/* Live Auctions */}
          <div className="grid grid-cols-1 gap-8 mb-8">
            <div className="discord-bg-darker rounded-xl border border-discord-dark">
              <div className="p-6 border-b border-discord-dark">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">실시간 경매</h3>
                  <button 
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    data-testid="button-create-auction"
                  >
                    <i className="fas fa-plus mr-2"></i>경매 생성
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {Array.isArray(auctions) && auctions.length > 0 ? (
                    auctions.slice(0, 3).map((auction: any) => (
                      <AuctionCard key={auction.id} auction={auction} />
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      진행중인 경매가 없습니다
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Portfolio guildId={selectedGuildId || ''} userId="web-client" />
            </div>
            
            <div>
              <RecentActivity guildId={selectedGuildId || ''} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
