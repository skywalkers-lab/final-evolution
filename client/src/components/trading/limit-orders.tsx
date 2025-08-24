import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale";

interface LimitOrdersProps {
  guildId: string;
}

export default function LimitOrders({ guildId }: LimitOrdersProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'executed' | 'cancelled'>('pending');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: limitOrders = [], isLoading } = useQuery({
    queryKey: ['/api/web-client/guilds', guildId, 'limit-orders', filter],
    queryFn: () => apiRequest('GET', `/api/web-client/guilds/${guildId}/limit-orders?status=${filter === 'all' ? '' : filter}`),
    enabled: !!guildId,
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest('DELETE', `/api/web-client/guilds/${guildId}/limit-orders/${orderId}`);
    },
    onSuccess: () => {
      toast({
        title: "주문 취소",
        description: "지정가 주문이 취소되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/web-client/guilds', guildId, 'limit-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/web-client/guilds', guildId, 'portfolio'] });
    },
    onError: (error: any) => {
      toast({
        title: "취소 실패",
        description: error.message || "주문 취소 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400';
      case 'executed': return 'text-green-400 bg-green-400';
      case 'cancelled': return 'text-gray-400 bg-gray-400';
      case 'expired': return 'text-red-400 bg-red-400';
      default: return 'text-gray-400 bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'executed': return '체결완료';
      case 'cancelled': return '취소됨';
      case 'expired': return '만료됨';
      default: return status;
    }
  };

  return (
    <div className="discord-bg-darker rounded-xl border border-discord-dark">
      <div className="p-6 border-b border-discord-dark">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">지정가 주문</h3>
            <p className="text-sm text-gray-400">예약된 주문 현황</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex mt-4 space-x-2">
          {[
            { value: 'all', label: '전체' },
            { value: 'pending', label: '대기중' },
            { value: 'executed', label: '체결완료' },
            { value: 'cancelled', label: '취소됨' }
          ].map((filterOption) => (
            <Button
              key={filterOption.value}
              size="sm"
              variant={filter === filterOption.value ? 'default' : 'ghost'}
              onClick={() => setFilter(filterOption.value as any)}
              className={`${
                filter === filterOption.value 
                  ? 'bg-discord-blue text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid={`button-filter-${filterOption.value}`}
            >
              {filterOption.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-center text-gray-400 py-8">로딩 중...</div>
        ) : limitOrders.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            {filter === 'pending' ? '대기중인 지정가 주문이 없습니다' : '주문 내역이 없습니다'}
          </div>
        ) : (
          <div className="space-y-4">
            {limitOrders.map((order: any, index: number) => (
              <div 
                key={order.id} 
                className="bg-discord-dark rounded-lg p-4 border border-discord-light"
                data-testid={`limit-order-${index}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(order.status).split(' ')[1]} bg-opacity-20`}></span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{order.symbol}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.type === 'buy' 
                            ? 'bg-green-600 bg-opacity-20 text-green-400' 
                            : 'bg-red-600 bg-opacity-20 text-red-400'
                        }`}>
                          {order.type === 'buy' ? '매수' : '매도'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {order.shares.toLocaleString()}주 @ ₩{Number(order.targetPrice).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ko })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-300">
                    <span>총 금액: </span>
                    <span className="text-white font-medium">
                      ₩{Number(order.totalAmount).toLocaleString()}
                    </span>
                  </div>
                  
                  {order.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelMutation.mutate(order.id)}
                      disabled={cancelMutation.isPending}
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      data-testid={`button-cancel-order-${index}`}
                    >
                      {cancelMutation.isPending ? '취소중...' : '주문취소'}
                    </Button>
                  )}
                  
                  {order.status === 'executed' && order.executedAt && (
                    <div className="text-xs text-green-400">
                      체결: {format(new Date(order.executedAt), 'MM/dd HH:mm', { locale: ko })}
                      {order.executedPrice && (
                        <div>₩{Number(order.executedPrice).toLocaleString()}</div>
                      )}
                    </div>
                  )}
                </div>

                {order.expiresAt && order.status === 'pending' && (
                  <div className="mt-2 text-xs text-gray-400">
                    만료일: {format(new Date(order.expiresAt), 'yyyy/MM/dd HH:mm', { locale: ko })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}