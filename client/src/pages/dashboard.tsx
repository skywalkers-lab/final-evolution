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
import LatestNews from "@/components/dashboard/latest-news";
import AuctionCard from "@/components/auctions/auction-card";
import LimitOrders from "@/components/trading/limit-orders";
import GuildSelector from "@/components/guild/guild-selector";
import ErrorBoundary from "@/components/error-boundary";

export default function Dashboard() {
  const { user, selectedGuildId, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [guilds] = useState([{ id: '1284053249057620018', name: 'Demo Server' }]); // Demo guild data

  const { data: overview = {}, refetch: refetchOverview } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'overview'],
    enabled: !!selectedGuildId,
  });

  const { data: portfolio } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'portfolio'],
    enabled: !!selectedGuildId,
  });

  const { data: stocks = [] } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'stocks'],
    enabled: !!selectedGuildId,
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'auctions'],
    enabled: !!selectedGuildId,
  });

  const { data: newsAnalyses = [] } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'news'],
    enabled: !!selectedGuildId,
    select: (data: any) => data || [],
  });

  // WebSocket handler for real-time updates
  useWebSocket((event: string, data: any) => {
    try {
      if (!event || !data) return;
      
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
        case 'account_password_changed':
          console.log('Account password changed:', data);
          if (data.guildId === selectedGuildId) {
            // Password was changed for current guild - force logout and reauthentication
            fetch(`/api/web-client/guilds/${selectedGuildId}/logout`, {
              method: "POST",
              credentials: "include",
            }).then(() => {
              // Force re-authentication by reloading page
              window.location.reload();
            }).catch(error => {
              console.error('Logout error:', error);
              // Still reload to force re-authentication
              window.location.reload();
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error handling WebSocket message in Dashboard:', error);
    }
  });

  // Commented out for demo purposes to allow access without login
  // useEffect(() => {
  //   if (!isLoading && !user) {
  //     setLocation("/login");
  //   }
  // }, [user, isLoading, setLocation]);

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

  // Allow access without authentication for demo purposes
  // if (!user) {
  //   return null;
  // }

  // Show guild selector if no guild is selected
  if (!selectedGuildId) {
    return <GuildSelector />;
  }

  // 계좌 비밀번호 인증 시스템 제거됨 - 직접 대시보드 접근 허용

  return (
    <div className="flex h-screen overflow-hidden discord-bg-darkest text-gray-100 font-inter">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <main className="flex-1 overflow-y-auto p-6" data-testid="dashboard-main">
          {/* Overview Cards */}
          <ErrorBoundary>
            <OverviewCards data={overview} portfolio={portfolio} />
          </ErrorBoundary>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Stock Chart */}
            <div className="lg:col-span-2">
              <ErrorBoundary>
                <StockChart 
                  symbol={selectedStock} 
                  guildId={selectedGuildId || ''}
                  onSymbolChange={setSelectedStock}
                  stocks={Array.isArray(stocks) ? stocks : []}
                />
              </ErrorBoundary>
            </div>

            {/* Trading Panel */}
            <div className="flex flex-col">
              <ErrorBoundary>
                <TradingPanel 
                  selectedStock={selectedStock}
                  guildId={selectedGuildId || ''}
                  stocks={Array.isArray(stocks) ? stocks : []}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Live Auctions */}
          <div className="mb-8">
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

          {/* Live News Analysis */}
          <div className="mb-8">
            <div className="discord-bg-darker rounded-xl border border-discord-dark">
              <div className="p-6 border-b border-discord-dark">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">실시간 뉴스 분석</h3>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-newspaper text-blue-500"></i>
                    <span className="text-blue-300 text-sm">AI 감정분석</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {Array.isArray(newsAnalyses) && newsAnalyses.length > 0 ? (
                    newsAnalyses.slice(0, 3).map((news: any) => (
                      <div key={news.id} className="bg-discord-dark rounded-lg p-4 border border-discord-light">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-medium text-sm leading-tight flex-1 pr-4">
                            {news.title}
                          </h4>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              news.sentiment === 'positive' ? 'bg-green-900 text-green-300 border border-green-500' :
                              news.sentiment === 'negative' ? 'bg-red-900 text-red-300 border border-red-500' :
                              'bg-yellow-900 text-yellow-300 border border-yellow-500'
                            }`}>
                              {news.sentiment === 'positive' ? '긍정' : 
                               news.sentiment === 'negative' ? '부정' : '중립'}
                            </span>
                            {news.symbol && (
                              <span className="bg-discord-darker text-gray-300 px-2 py-1 rounded text-xs">
                                {news.symbol}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                          {news.content}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            {new Date(news.createdAt).toLocaleDateString('ko-KR')} {new Date(news.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-gray-400">
                            시장 영향: <span className={`${
                              Math.abs(Number(news.priceImpact) * 100) >= 5 ? 'text-red-400' :
                              Math.abs(Number(news.priceImpact) * 100) >= 2 ? 'text-yellow-400' :
                              'text-gray-400'
                            }`}>
                              {Math.abs(Number(news.priceImpact) * 100) >= 5 ? '높음' :
                               Math.abs(Number(news.priceImpact) * 100) >= 2 ? '중간' : '낮음'}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      분석된 뉴스가 없습니다
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio, Limit Orders & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <ErrorBoundary>
                <Portfolio guildId={selectedGuildId || ''} userId="web-client" />
              </ErrorBoundary>
            </div>
            
            <div>
              <ErrorBoundary>
                <LimitOrders guildId={selectedGuildId || ''} />
              </ErrorBoundary>
            </div>
            
            <div>
              <ErrorBoundary>
                <LatestNews guildId={selectedGuildId || ''} />
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
