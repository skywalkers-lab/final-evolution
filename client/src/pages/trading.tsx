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
import { useWebSocket } from "@/hooks/use-websocket";

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
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">주식 거래</h1>
              <p className="text-gray-400 mt-1">실시간 주식 매매 및 포트폴리오 관리</p>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-chart-line text-green-500 text-2xl"></i>
              <span className="text-green-300 font-semibold">실시간 거래</span>
            </div>
          </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 차트 영역 */}
        <div className="xl:col-span-2">
          {selectedGuildId ? (
            <StockChart 
              symbol={selectedStock}
              guildId={selectedGuildId}
              stocks={stocks}
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
        <div className="space-y-6">
          {selectedGuildId && (
            <TradingPanel 
              selectedStock={selectedStock}
              guildId={selectedGuildId}
              stocks={stocks}
            />
          )}
          
          {/* 포트폴리오 */}
          <Portfolio portfolio={portfolio} />
          
          {/* 시장 현황 */}
          <Card className="discord-bg-darker border-discord-dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <i className="fas fa-globe text-blue-500"></i>
                <span>시장 현황</span>
              </CardTitle>
              <CardDescription>주요 지수 및 시장 동향</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'KOSPI', value: '2,485.67', change: '+1.2%', positive: true },
                { name: 'KOSDAQ', value: '745.32', change: '-0.8%', positive: false },
                { name: 'USD/KRW', value: '1,327.50', change: '+0.3%', positive: true },
              ].map((index, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-discord-dark rounded">
                  <span className="text-white font-medium">{index.name}</span>
                  <div className="text-right">
                    <div className="text-white">{index.value}</div>
                    <div className={index.positive ? 'text-red-400' : 'text-blue-400'}>
                      {index.change}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}