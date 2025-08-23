import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useState } from "react";

interface RecentActivityProps {
  guildId: string;
}

export default function RecentActivity({ guildId }: RecentActivityProps) {
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const { data: transactions, refetch } = useQuery({
    queryKey: ['/api/guilds', guildId, 'transactions'],
    enabled: !!guildId,
  });

  // WebSocket handler for real-time activity updates
  useWebSocket((event: string, data: any) => {
    if (event === 'trade_executed' || event === 'transaction_completed' || event === 'auction_bid' || event === 'account_deleted') {
      refetch();
      // Add to recent activities list for immediate UI update
      const newActivity = {
        id: Date.now(),
        type: event,
        data,
        timestamp: new Date().toISOString(),
      };
      setRecentActivities(prev => [newActivity, ...prev.slice(0, 4)]);
    }
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'stock_buy':
        return { icon: 'fas fa-arrow-up', color: 'bg-discord-green', textColor: 'text-discord-green' };
      case 'stock_sell':
        return { icon: 'fas fa-arrow-down', color: 'bg-discord-red', textColor: 'text-discord-red' };
      case 'transfer_in':
      case 'transfer_out':
        return { icon: 'fas fa-exchange-alt', color: 'bg-blue-500', textColor: 'text-blue-400' };
      case 'auction_hold':
      case 'auction_bid':
        return { icon: 'fas fa-gavel', color: 'bg-purple-500', textColor: 'text-purple-400' };
      case 'tax':
        return { icon: 'fas fa-coins', color: 'bg-yellow-500', textColor: 'text-yellow-400' };
      case 'payroll_in':
        return { icon: 'fas fa-money-bill-wave', color: 'bg-green-500', textColor: 'text-green-400' };
      case 'account_deleted':
        return { icon: 'fas fa-trash-alt', color: 'bg-red-500', textColor: 'text-red-400' };
      default:
        return { icon: 'fas fa-circle', color: 'bg-gray-500', textColor: 'text-gray-400' };
    }
  };

  const getActivityDescription = (transaction: any) => {
    switch (transaction.type) {
      case 'stock_buy':
        return '주식 매수';
      case 'stock_sell':
        return '주식 매도';
      case 'transfer_in':
        return '계좌 이체 수신';
      case 'transfer_out':
        return '계좌 이체 송금';
      case 'auction_hold':
        return '경매 입찰';
      case 'tax':
        return '세금 납부';
      case 'payroll_in':
        return '급여 수령';
      case 'account_deleted':
        return '계좌 삭제됨';
      default:
        return transaction.memo || '거래';
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  const getAmountDisplay = (transaction: any) => {
    const amount = Number(transaction.amount);
    const isIncoming = ['transfer_in', 'payroll_in', 'stock_sell'].includes(transaction.type);
    
    if (transaction.type === 'stock_buy' || transaction.type === 'stock_sell') {
      return transaction.memo || `₩${amount.toLocaleString()}`;
    }
    
    return `${isIncoming ? '+' : '-'}₩${amount.toLocaleString()}`;
  };

  const displayTransactions = Array.isArray(transactions) ? transactions.slice(0, 5) : [];

  return (
    <div className="discord-bg-darker rounded-xl border border-discord-dark">
      <div className="p-6 border-b border-discord-dark">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">최근 활동</h3>
          <button className="text-discord-light hover:text-white text-sm" data-testid="button-view-all-activity">
            전체 보기
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {displayTransactions.length > 0 ? (
          <div className="space-y-4">
            {displayTransactions.map((transaction: any, index: number) => {
              const activity = getActivityIcon(transaction.type);
              
              return (
                <div 
                  key={transaction.id || index}
                  className="flex items-center space-x-3 p-3 bg-discord-dark rounded-lg"
                  data-testid={`activity-item-${index}`}
                >
                  <div className={`w-10 h-10 ${activity.color} bg-opacity-20 rounded-full flex items-center justify-center`}>
                    <i className={`${activity.icon} ${activity.textColor} text-sm`}></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm" data-testid={`text-activity-description-${index}`}>
                      {getActivityDescription(transaction)}
                    </p>
                    <p className="text-gray-400 text-xs" data-testid={`text-activity-time-${index}`}>
                      {formatTime(transaction.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium text-sm" data-testid={`text-activity-amount-${index}`}>
                      {getAmountDisplay(transaction)}
                    </p>
                    {transaction.memo && transaction.type !== 'stock_buy' && transaction.type !== 'stock_sell' && (
                      <p className="text-gray-400 text-xs">{transaction.memo}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            최근 활동이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
