import { useEffect, useState, lazy, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";
import OverviewCards from "@/components/dashboard/overview-cards";
import SimpleStockChart from "@/components/trading/simple-stock-chart";
import TradingPanel from "@/components/trading/trading-panel";
import LimitOrders from "@/components/trading/limit-orders";
import GuildSelector from "@/components/guild/guild-selector";
import ErrorBoundary from "@/components/error-boundary";
import { OrderBook } from "@/components/OrderBook";
import { MarketDepth } from "@/components/MarketDepth";
import { RealTimeQuote } from "@/components/trading/real-time-quote";
import { TradeExecutionList } from "@/components/trading/trade-execution-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

// Lazy load heavy components
const CircuitBreakerAlert = lazy(() => import("@/components/trading/circuit-breaker-alert"));
const Portfolio = lazy(() => import("@/components/trading/portfolio"));

export default function Dashboard() {
  const { user, selectedGuildId, selectGuild, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [chartTimeframe, setChartTimeframe] = useState<string>('1day');
  const [guilds] = useState([{ id: '1284053249057620018', name: 'Demo Server' }]); // Demo guild data

  // Read guild ID from URL query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guildIdFromUrl = params.get('guild');
    
    if (guildIdFromUrl && !selectedGuildId) {
      selectGuild(guildIdFromUrl);
    }
  }, []);

  const { data: overview = { totalAssets: 0, activeTrades: 0, liveAuctions: 0 }, refetch: refetchOverview } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'overview'],
    enabled: !!selectedGuildId,
  });

  const { data: portfolio = { balance: '0', totalValue: 0 } } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'portfolio'],
    enabled: !!selectedGuildId,
  });

  const { data: stocks = [] } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'stocks'],
    enabled: !!selectedGuildId,
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    // Set default selected stock - 첫 번째 활성화된 주식 자동 선택
    if (stocks && Array.isArray(stocks) && stocks.length > 0) {
      // 서킷브레이커가 걸리지 않은 주식 우선 선택
      const activeStock = stocks.find(s => s.status === 'active') || stocks[0];
      if (!selectedStock || !stocks.find(s => s.symbol === selectedStock)) {
        console.log('[Dashboard] Auto-selecting stock:', activeStock);
        setSelectedStock(activeStock.symbol);
      }
    }
  }, [stocks]);

  // Debug: Log selected stock and stocks data
  useEffect(() => {
    console.log('[Dashboard] Selected stock:', selectedStock);
    console.log('[Dashboard] Stocks data:', stocks);
  }, [selectedStock, stocks]);

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
    <div className="flex h-screen overflow-hidden bg-gray-900">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar />
        
        {/* HTS Main Dashboard */}
        <div className="flex-1 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-gray-100 font-mono p-2 flex flex-col overflow-hidden">
          {/* 상단 계좌정보 바 */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-600 rounded mb-1 px-3 py-1.5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="text-xs">
                  <span className="text-slate-400">예수금:</span>
                  <span className="text-yellow-400 font-bold ml-1.5">
                    ₩{portfolio?.balance ? parseInt(portfolio.balance).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">평가금액:</span>
                  <span className="text-blue-400 font-bold ml-1.5">
                    ₩{portfolio?.totalValue ? portfolio.totalValue.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">총자산:</span>
                  <span className="text-green-400 font-bold ml-1.5">
                    ₩{overview?.totalAssets ? overview.totalAssets.toLocaleString() : '0'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-xs">
                <div className="text-center">
                  <span className="text-slate-400 mr-1">거래:</span>
                  <span className="text-orange-400 font-bold">{overview?.activeTrades || 0}</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 mr-1">경매:</span>
                  <span className="text-purple-400 font-bold">{overview?.liveAuctions || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* HTS 메인 대시보드 영역 */}
          <div className="flex-1 overflow-hidden flex flex-col" data-testid="dashboard-main">
            {selectedStock ? (
              <>
              {/* 상단 서킷브레이커 영역 */}
              {selectedGuildId && (
                <div className="mb-1 h-12 flex-shrink-0">
                  <div className="h-full bg-slate-800 border border-slate-600 rounded">
                    <ErrorBoundary>
                      <Suspense fallback={<div className="h-full bg-slate-700 animate-pulse rounded" />}>
                        <CircuitBreakerAlert guildId={selectedGuildId} />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                </div>
              )}

              {/* 메인 트레이딩 영역 - HTS 스타일 4분할 레이아웃 (리사이즈 가능) */}
              <div className="flex-1 overflow-hidden">
                <PanelGroup direction="horizontal" className="h-full gap-1">
                  {/* 좌측 상단: 종목 정보 + 실시간 호가 */}
                  <Panel defaultSize={30} minSize={20} maxSize={50}>
                    <div className="h-full pr-0.5">
                      <PanelGroup direction="vertical" className="h-full">
                        {/* 종목 정보 패널 */}
                        <Panel defaultSize={15} minSize={10} maxSize={25}>
                          <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 mb-0.5">
                            <ErrorBoundary>
                              <RealTimeQuote 
                                guildId={selectedGuildId || ''} 
                                symbol={selectedStock}
                              />
                            </ErrorBoundary>
                          </div>
                        </Panel>

                        {/* 세로 리사이즈 핸들 */}
                        <PanelResizeHandle className="h-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-row-resize" />
                        
                        {/* 호가창 */}
                        <Panel defaultSize={85} minSize={60}>
                          <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 flex flex-col min-h-0 mt-0.5">
                            <div className="text-xs font-bold text-slate-300 mb-2 border-b border-slate-600 pb-1 flex-shrink-0">
                              📊 실시간 호가
                            </div>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                              <ErrorBoundary>
                                <OrderBook 
                                  guildId={selectedGuildId || ''} 
                                  symbol={selectedStock}
                                  depth={10}
                                  onPriceClick={(price) => {
                                    console.log('Selected price:', price);
                                  }}
                                />
                              </ErrorBoundary>
                            </div>
                          </div>
                        </Panel>
                      </PanelGroup>
                    </div>
                  </Panel>

                  {/* 리사이즈 핸들 */}
                  <PanelResizeHandle className="w-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

                  {/* 중앙: 차트 영역 */}
                  <Panel defaultSize={45} minSize={30} maxSize={60}>
                    <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 flex flex-col min-h-0 mx-0.5">
                      <div className="text-xs font-bold text-slate-300 mb-2 border-b border-slate-600 pb-1 flex-shrink-0">
                        📈 실시간 차트
                      </div>
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <ErrorBoundary>
                          <SimpleStockChart 
                            symbol={selectedStock} 
                            guildId={selectedGuildId || ''}
                            onSymbolChange={setSelectedStock}
                            stocks={Array.isArray(stocks) ? stocks : []}
                          />
                        </ErrorBoundary>
                      </div>
                    </div>
                  </Panel>

                  {/* 리사이즈 핸들 */}
                  <PanelResizeHandle className="w-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

                  {/* 우측: 포트폴리오 + 주문 영역 */}
                  <Panel defaultSize={25} minSize={20} maxSize={40}>
                    <div className="h-full pl-0.5">
                      <PanelGroup direction="vertical" className="h-full">
                        {/* 포트폴리오 */}
                        <Panel defaultSize={45} minSize={30} maxSize={70}>
                          <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 flex flex-col min-h-0 mb-0.5">
                            <div className="text-xs font-bold text-slate-300 mb-2 border-b border-slate-600 pb-1 flex-shrink-0">
                              💼 보유종목
                            </div>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                              <ErrorBoundary>
                                <Suspense fallback={<div className="h-full bg-slate-700 animate-pulse rounded" />}>
                                  <Portfolio 
                                    guildId={selectedGuildId || ''} 
                                    userId={user?.id || ''}
                                  />
                                </Suspense>
                              </ErrorBoundary>
                            </div>
                          </div>
                        </Panel>

                        {/* 세로 리사이즈 핸들 */}
                        <PanelResizeHandle className="h-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-row-resize" />
                        
                        {/* 주문창 */}
                        <Panel defaultSize={55} minSize={30}>
                          <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 flex flex-col min-h-0 mt-0.5">
                            <div className="text-xs font-bold text-slate-300 mb-2 border-b border-slate-600 pb-1 flex-shrink-0">
                              🎯 주문하기
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                      <ErrorBoundary>
                        <TradingPanel 
                          selectedStock={selectedStock}
                          guildId={selectedGuildId || ''}
                          stocks={Array.isArray(stocks) ? stocks : []}
                        />
                      </ErrorBoundary>
                    </div>
                          </div>
                        </Panel>
                      </PanelGroup>
                    </div>
                  </Panel>
                </PanelGroup>
              </div>

              {/* 하단: 체결내역 + 미체결 주문 (리사이즈 가능) */}
              <div className="h-48 flex-shrink-0 mt-1">
                <PanelGroup direction="horizontal" className="h-full gap-1">
                  {/* 체결내역 */}
                  <Panel defaultSize={35} minSize={25} maxSize={50}>
                    <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 flex flex-col overflow-hidden pr-0.5">
                  <div className="text-xs font-bold text-slate-300 mb-2 border-b border-slate-600 pb-1 flex-shrink-0">
                    ✅ 체결내역
                  </div>
                  <div className="flex-1 overflow-auto">
                    <ErrorBoundary>
                      <TradeExecutionList 
                        guildId={selectedGuildId || ''} 
                        symbol={selectedStock}
                      />
                    </ErrorBoundary>
                  </div>
                    </div>
                  </Panel>

                  {/* 리사이즈 핸들 */}
                  <PanelResizeHandle className="w-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

                  {/* 미체결주문 */}
                  <Panel defaultSize={35} minSize={25} maxSize={50}>
                    <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 flex flex-col min-h-0 mx-0.5">
                  <div className="text-xs font-bold text-slate-300 mb-2 border-b border-slate-600 pb-1 flex-shrink-0">
                    ⏳ 미체결주문
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <ErrorBoundary>
                      <LimitOrders guildId={selectedGuildId || ''} />
                    </ErrorBoundary>
                  </div>
                    </div>
                  </Panel>

                  {/* 리사이즈 핸들 */}
                  <PanelResizeHandle className="w-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

                  {/* 시장깊이 */}
                  <Panel defaultSize={30} minSize={20} maxSize={40}>
                    <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 flex flex-col min-h-0 pl-0.5">
                  <div className="text-xs font-bold text-slate-300 mb-2 border-b border-slate-600 pb-1 flex-shrink-0">
                    📊 시장깊이
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <ErrorBoundary>
                      <MarketDepth 
                      guildId={selectedGuildId || ''} 
                      symbol={selectedStock}
                    />
                    </ErrorBoundary>
                  </div>
                    </div>
                  </Panel>
                </PanelGroup>
              </div>
            </>
            ) : (
            /* 종목 선택 안 됨 - 종목 선택 화면 */
            <div className="h-full flex items-center justify-center bg-slate-800 border border-slate-600 rounded">
              <div className="text-center p-8">
                <div className="text-4xl mb-4">📊</div>
                <h2 className="text-xl font-bold text-slate-300 mb-2">종목을 선택해주세요</h2>
                <p className="text-slate-400 mb-4">좌측에서 종목을 선택하면 실시간 차트가 표시됩니다</p>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
