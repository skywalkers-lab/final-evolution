import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StockChart from "@/components/trading/stock-chart";
import Portfolio from "@/components/trading/portfolio";
import TradingPanel from "@/components/trading/trading-panel";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";
import GuildSelector from "@/components/guild/guild-selector";
import OverviewCards from "@/components/dashboard/overview-cards";
import { useWebSocket } from "@/hooks/use-websocket";
import CircuitBreakerAlert from "@/components/trading/circuit-breaker-alert";

export default function TradingPage() {
  const { user, selectedGuildId, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStock, setSelectedStock] = useState('');

  const { data: stocks = [], refetch: refetchStocks } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'stocks'],
    enabled: !!selectedGuildId,
  });

  const { data: portfolio } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'portfolio'],
    enabled: !!selectedGuildId,
  });

  const { data: overview } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'overview'],
    enabled: !!selectedGuildId,
  });
  
  // WebSocket handler for real-time stock updates
  useWebSocket((event: string, data: any) => {
    switch (event) {
      case 'stock_created':
      case 'stock_deleted':
      case 'stock_price_updated':
        console.log(`Stock ${event}:`, data);
        refetchStocks(); // Refresh stock list
        break;
    }
  });
  
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

  if (!user) {
    return null;
  }

  if (!selectedGuildId) {
    return (
      <div className="min-h-screen discord-bg-darkest flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 flex items-center justify-center">
            <GuildSelector />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen discord-bg-darkest flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
          {/* 간소화된 헤더 */}
          <div className="flex items-center justify-between bg-slate-800/50 border border-slate-600 rounded px-4 py-2">
            <div className="flex items-center space-x-3">
              <i className="fas fa-chart-line text-green-500 text-lg"></i>
              <div>
                <h1 className="text-lg font-bold text-white">간편 주식거래</h1>
                <p className="text-gray-400 text-xs">실시간 매매</p>
              </div>
            </div>
            {/* 간단한 계좌정보 */}
            <div className="flex items-center space-x-4 text-sm">
              <div>
                <span className="text-gray-400">예수금: </span>
                <span className="text-yellow-400 font-bold">
                  ₩{portfolio?.balance ? parseInt(portfolio.balance as any).toLocaleString() : '0'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">총자산: </span>
                <span className="text-green-400 font-bold">
                  ₩{overview?.totalAssets ? (overview.totalAssets as any).toLocaleString() : '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Circuit Breaker Alert - 축소 */}
          {selectedGuildId && (
            <div className="max-h-12">
              <CircuitBreakerAlert guildId={selectedGuildId} />
            </div>
          )}

          {/* 메인 거래 영역 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {/* 차트 영역 */}
            <div className="xl:col-span-2">
              {selectedGuildId ? (
                <StockChart 
                  symbol={selectedStock}
                  guildId={selectedGuildId}
                  stocks={stocks as any[] || []}
                  onSymbolChange={setSelectedStock}
                />
              ) : (
                <Card className="discord-bg-darker border-discord-dark">
                  <CardContent className="flex items-center justify-center h-80">
                    <div className="text-center text-gray-400">
                      <i className="fas fa-server text-4xl mb-4"></i>
                      <p>서버를 선택해주세요</p>
                      <p className="text-sm mt-2">좌측 상단에서 서버를 선택하면 주식 거래를 시작할 수 있습니다.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 거래 패널 */}
            <div className="space-y-3">
              {selectedGuildId && (
                <TradingPanel 
                  selectedStock={selectedStock}
                  guildId={selectedGuildId}
                  stocks={stocks as any[] || []}
                />
              )}
              
              {/* 포트폴리오 */}
              <Portfolio 
                guildId={selectedGuildId} 
                userId={user.id}
              />
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}