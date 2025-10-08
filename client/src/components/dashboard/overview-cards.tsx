import { useWebSocket } from "@/hooks/use-websocket";
import { useState, useEffect } from "react";
import { formatKoreanCurrency } from "@/utils/formatCurrency";

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
    try {
      if (!event) return;
      
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
          setStats(prev => ({ ...prev, taxCollected: prev.taxCollected + (data?.amount || 0) }));
          break;
      }
    } catch (error) {
      console.error('Error handling WebSocket message in OverviewCards:', error);
    }
  });

  const cards = [
    {
      title: "총 자산",
      value: formatKoreanCurrency(stats.totalAssets),
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
      value: formatKoreanCurrency(stats.taxCollected),
      change: "다음 징수: 15일",
      changeText: "월간",
      icon: "fas fa-coins",
      color: "discord-red",
      testId: "card-tax-collected"
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-1 h-full">
      {cards.map((card, index) => (
        <div 
          key={card.title}
          className="discord-bg-darker rounded border border-discord-dark p-1 flex items-center justify-between"
          data-testid={card.testId}
        >
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <div className={`p-0.5 bg-${card.color} bg-opacity-20 rounded flex-shrink-0`}>
              <i className={`${card.icon} text-${card.color} text-[9px]`}></i>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] text-gray-400 leading-tight truncate">{card.title}</p>
              <p className="text-[11px] font-bold text-white leading-tight truncate" data-testid={`text-${card.testId}-value`}>
                {card.value}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-1">
            <span className={`text-[8px] font-medium ${card.change.startsWith('+') ? 'text-discord-green' : 'text-gray-400'}`}>
              {card.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
