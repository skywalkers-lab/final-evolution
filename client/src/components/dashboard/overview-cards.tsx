import { useWebSocket } from "@/hooks/use-websocket";
import { useState, useEffect } from "react";

interface OverviewCardsProps {
  data?: any;
  portfolio?: any;
}

export default function OverviewCards({ data, portfolio }: OverviewCardsProps) {
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeTrades: 0,
    liveAuctions: 0,
    taxCollected: 0,
  });

  useEffect(() => {
    if (data || portfolio) {
      setStats({
        totalAssets: portfolio?.totalValue || data?.totalAssets || 0,
        activeTrades: data?.activeTrades || 0,
        liveAuctions: data?.liveAuctions || 0,
        taxCollected: data?.taxCollected || 0,
      });
    }
  }, [data, portfolio]);

  // WebSocket handler for real-time updates
  useWebSocket((event: string, data: any) => {
    switch (event) {
      case 'trade_executed':
        setStats(prev => ({ ...prev, activeTrades: prev.activeTrades + 1 }));
        break;
      case 'auction_started':
        setStats(prev => ({ ...prev, liveAuctions: prev.liveAuctions + 1 }));
        break;
      case 'auction_settled':
      case 'auction_canceled':
        setStats(prev => ({ ...prev, liveAuctions: Math.max(0, prev.liveAuctions - 1) }));
        break;
      case 'tax_collected':
        setStats(prev => ({ ...prev, taxCollected: prev.taxCollected + (data.amount || 0) }));
        break;
    }
  });

  const cards = [
    {
      title: "총 자산",
      value: `₩${stats.totalAssets.toLocaleString()}`,
      change: "+5.2%",
      changeText: "지난 24시간",
      icon: "fas fa-wallet",
      color: "discord-blue",
      testId: "card-total-assets"
    },
    {
      title: "완료된 거래",
      value: stats.activeTrades.toString(),
      change: stats.activeTrades > 0 ? "거래 활발" : "거래 없음",
      changeText: "오늘 현재",
      icon: "fas fa-chart-line",
      color: "discord-gold",
      testId: "card-active-trades"
    },
    {
      title: "진행중 경매",
      value: stats.liveAuctions.toString(),
      change: stats.liveAuctions > 2 ? "2개 마감 임박" : "정상 진행중",
      changeText: "",
      icon: "fas fa-gavel",
      color: "purple-500",
      testId: "card-live-auctions"
    },
    {
      title: "세금 징수액",
      value: `₩${stats.taxCollected.toLocaleString()}`,
      change: "다음 징수: 15일",
      changeText: "월간",
      icon: "fas fa-coins",
      color: "discord-red",
      testId: "card-tax-collected"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div 
          key={card.title}
          className="discord-bg-darker rounded-xl border border-discord-dark p-6"
          data-testid={card.testId}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 bg-${card.color} bg-opacity-20 rounded-lg`}>
              <i className={`${card.icon} text-${card.color}`}></i>
            </div>
            <span className="text-xs text-gray-500">실시간</span>
          </div>
          <div>
            <p className="text-sm text-gray-400">{card.title}</p>
            <p className="text-2xl font-bold text-white" data-testid={`text-${card.testId}-value`}>
              {card.value}
            </p>
            <div className="flex items-center mt-2">
              <span className={`text-sm ${card.change.startsWith('+') ? 'text-discord-green' : 'text-gray-400'}`}>
                {card.change}
              </span>
              {card.changeText && (
                <span className="text-gray-400 text-sm ml-2">{card.changeText}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
