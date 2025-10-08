import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";
import StockChart from "@/components/trading/stock-chart";
import TradingPanel from "@/components/trading/trading-panel";
import LimitOrders from "@/components/trading/limit-orders";
import GuildSelector from "@/components/guild/guild-selector";
import ErrorBoundary from "@/components/error-boundary";
import { OrderBook } from "@/components/OrderBook";
import { TradeExecutionList } from "@/components/trading/trade-execution-list";
import { RealTimeQuote } from "@/components/trading/real-time-quote";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export default function StockTrading() {
  const { user, selectedGuildId, selectGuild, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStock, setSelectedStock] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guildIdFromUrl = params.get('guild');
    
    if (guildIdFromUrl && !selectedGuildId) {
      selectGuild(guildIdFromUrl);
    }
  }, []);

  const { data: stocks = [] } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'stocks'],
    enabled: !!selectedGuildId,
  });

  useEffect(() => {
    if (stocks && Array.isArray(stocks) && stocks.length > 0 && !selectedStock) {
      setSelectedStock(stocks[0].symbol);
    }
  }, [stocks, selectedStock]);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen discord-bg-darkest flex items-center justify-center">
        <div className="animate-pulse-discord text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (!selectedGuildId) {
    return <GuildSelector />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <div className="flex-1 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-gray-100 font-mono p-2 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedStock ? (
              <>
                {/* 상단 종목 정보 */}
                <div className="flex gap-1 mb-1 h-20 flex-shrink-0">
                  <div className="flex-1 bg-slate-800 border border-slate-600 rounded p-2">
                    <ErrorBoundary>
                      <RealTimeQuote 
                        guildId={selectedGuildId || ''} 
                        symbol={selectedStock}
                      />
                    </ErrorBoundary>
                  </div>
                </div>

                {/* 메인 트레이딩 영역 */}
                <div className="flex-1 overflow-hidden">
                  <PanelGroup direction="horizontal" className="h-full gap-1">
                    {/* 좌측: 호가창 */}
                    <Panel defaultSize={25} minSize={20} maxSize={40}>
                      <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 flex flex-col min-h-0 pr-0.5">
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

                    <PanelResizeHandle className="w-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

                    {/* 중앙: 상세 차트 영역 */}
                    <Panel defaultSize={50} minSize={40} maxSize={70}>
                      <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 flex flex-col min-h-0 mx-0.5">
                        <div className="text-xs font-bold text-slate-300 mb-2 border-b border-slate-600 pb-1 flex-shrink-0">
                          📈 상세 차트 분석
                        </div>
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <ErrorBoundary>
                            <StockChart 
                              symbol={selectedStock} 
                              guildId={selectedGuildId || ''}
                              onSymbolChange={setSelectedStock}
                              stocks={Array.isArray(stocks) ? stocks : []}
                            />
                          </ErrorBoundary>
                        </div>
                      </div>
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

                    {/* 우측: 주문창 */}
                    <Panel defaultSize={25} minSize={20} maxSize={40}>
                      <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 flex flex-col min-h-0 pl-0.5">
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

                {/* 하단: 체결내역 + 미체결주문 */}
                <div className="h-48 flex-shrink-0 mt-1">
                  <PanelGroup direction="horizontal" className="h-full gap-1">
                    <Panel defaultSize={50} minSize={30} maxSize={70}>
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

                    <PanelResizeHandle className="w-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

                    <Panel defaultSize={50} minSize={30} maxSize={70}>
                      <div className="h-full bg-slate-800 border border-slate-600 rounded p-2 flex flex-col min-h-0 pl-0.5">
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
                  </PanelGroup>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center bg-slate-800 border border-slate-600 rounded">
                <div className="text-center p-8">
                  <div className="text-4xl mb-4">📊</div>
                  <h2 className="text-xl font-bold text-slate-300 mb-2">종목을 선택해주세요</h2>
                  <p className="text-slate-400 mb-4">좌측에서 종목을 선택하면 상세 차트가 표시됩니다</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
