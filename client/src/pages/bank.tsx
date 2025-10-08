import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";
import GuildSelector from "@/components/guild/guild-selector";
import { formatKoreanCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function BankPage() {
  const { user, selectedGuildId, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [memo, setMemo] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('30d');
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  const { data: accountData, refetch: refetchAccount } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'account'],
    enabled: !!selectedGuildId,
  });

  const { data: transactionHistory } = useQuery({
    queryKey: ['/api/web-client/guilds', selectedGuildId, 'transactions'],
    enabled: !!selectedGuildId,
  });

  // 지정가 주문 조회
  const { data: limitOrders } = useQuery({
    queryKey: [`/api/web-client/guilds/${selectedGuildId}/limit-orders`, 'pending'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/web-client/guilds/${selectedGuildId}/limit-orders?status=pending`);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!selectedGuildId,
    refetchInterval: 5000, // 5초마다 자동 갱신
  });

  const transferMutation = useMutation({
    mutationFn: async (data: { accountNumber: string; amount: number; memo: string }) => {
      const response = await fetch(`/api/guilds/${selectedGuildId}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '송금 실패');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: '✅ 송금 성공', description: '송금이 완료되었습니다.' });
      setAmount('');
      setAccountNumber('');
      setMemo('');
      refetchAccount();
    },
    onError: (error: any) => {
      toast({ 
        title: '❌ 송금 실패', 
        description: error.message || '송금 중 오류가 발생했습니다.',
        variant: 'destructive' 
      });
    },
  });

  const handleTransfer = () => {
    if (!accountNumber || !amount) {
      toast({ 
        title: '입력 오류', 
        description: '계좌번호와 금액을 모두 입력해주세요.',
        variant: 'destructive' 
      });
      return;
    }
    
    const numAmount = parseInt(amount);
    if (numAmount <= 0) {
      toast({ 
        title: '입력 오류', 
        description: '송금액은 0보다 커야 합니다.',
        variant: 'destructive' 
      });
      return;
    }
    
    transferMutation.mutate({ accountNumber, amount: numAmount, memo });
  };

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
              <h1 className="text-3xl font-bold text-white">은행 & 계좌</h1>
              <p className="text-gray-400 mt-1">가상 은행 서비스 및 계좌 관리</p>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-university text-yellow-500 text-2xl"></i>
              <span className="text-yellow-300 font-semibold">한국은행 서비스</span>
            </div>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 계좌 정보 */}
        <Card className="discord-bg-darker border-discord-dark">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <i className="fas fa-wallet text-green-500"></i>
              <span>내 계좌</span>
            </CardTitle>
            <CardDescription>현재 잔액 및 계좌 정보</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-discord-dark rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">계좌번호</span>
                <span className="text-white font-mono" data-testid="text-account-number">
                  {(accountData as any)?.account?.uniqueCode || '계좌 없음'}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">현재 잔액</span>
                <span className="text-2xl font-bold text-green-400" data-testid="text-balance">
                  {(accountData as any)?.account ? formatKoreanCurrency(Number((accountData as any).account.balance)) : '계좌 없음'}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">계좌 상태</span>
                {(accountData as any)?.account ? (
                  <Badge variant="outline" className={`${(accountData as any).account.frozen ? 'border-red-500 text-red-400' : 'border-green-500 text-green-400'}`}>
                    <i className={`fas ${(accountData as any).account.frozen ? 'fa-lock' : 'fa-check-circle'} mr-1`}></i>
                    {(accountData as any).account.frozen ? '동결' : '정상'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500 text-red-400">
                    <i className="fas fa-times-circle mr-1"></i>
                    계좌 없음
                  </Badge>
                )}
              </div>
            </div>

            {(accountData as any)?.account ? (
              <Button 
                className="w-full bg-discord-blue hover:bg-discord-blue/80" 
                data-testid="button-refresh-balance"
                onClick={() => refetchAccount()}
              >
                <i className="fas fa-sync-alt mr-2"></i>
                잔액 새로고침
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center space-x-2 text-yellow-400">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span className="text-sm font-medium">계좌가 없습니다</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Discord에서 <code className="bg-gray-800 px-1 rounded text-yellow-300">/계좌개설</code> 명령어를 사용해 계좌를 만드세요.
                  </p>
                </div>
                <Button 
                  className="w-full bg-gray-600 hover:bg-gray-700" 
                  data-testid="button-refresh-account"
                  onClick={() => refetchAccount()}
                >
                  <i className="fas fa-sync-alt mr-2"></i>
                  계좌 상태 새로고침
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 송금 */}
        <Card className="discord-bg-darker border-discord-dark">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <i className="fas fa-paper-plane text-blue-500"></i>
              <span>송금</span>
            </CardTitle>
            <CardDescription>다른 사용자에게 돈을 보내기</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountNumber" className="text-white">받는 사람 계좌번호</Label>
              <Input 
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="3-4자리 계좌번호 입력"
                className="bg-discord-dark border-discord-light text-white font-mono"
                data-testid="input-account-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white">송금액</Label>
              <Input 
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₩ 금액 입력"
                className="bg-discord-dark border-discord-light text-white"
                data-testid="input-transfer-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memo" className="text-white">메모 (선택사항)</Label>
              <Input 
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="송금 메모"
                className="bg-discord-dark border-discord-light text-white"
                data-testid="input-transfer-memo"
              />
            </div>
            <Button 
              className="w-full bg-green-600 hover:bg-green-700" 
              data-testid="button-transfer"
              onClick={handleTransfer}
              disabled={transferMutation.isPending || !(accountData as any)?.account}
            >
              <i className="fas fa-paper-plane mr-2"></i>
              {transferMutation.isPending ? '송금 중...' : '송금하기'}
            </Button>
            
            {!(accountData as any)?.account && (
              <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-center">
                <span className="text-xs text-red-400">계좌가 없어 송금할 수 없습니다</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 지정가 주문 */}
        {limitOrders && limitOrders.length > 0 && (
          <Card className="discord-bg-darker border-discord-dark lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-clock text-yellow-500"></i>
                  <span>대기중인 지정가 주문</span>
                </div>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                  {limitOrders.length}건
                </Badge>
              </CardTitle>
              <CardDescription>예약된 매수/매도 주문</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {limitOrders.map((order: any, index: number) => {
                  const executedShares = order.executedShares || 0;
                  const remainingShares = order.shares - executedShares;
                  const fillPercentage = executedShares > 0 ? (executedShares / order.shares) * 100 : 0;
                  const isPartiallyFilled = executedShares > 0 && executedShares < order.shares;
                  
                  return (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-discord-dark rounded-lg border border-discord-light">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`w-2 h-2 rounded-full ${order.type === 'buy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{order.symbol}</span>
                            <Badge variant="outline" className={order.type === 'buy' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}>
                              {order.type === 'buy' ? '매수' : '매도'}
                            </Badge>
                            {isPartiallyFilled && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                                부분체결 {fillPercentage.toFixed(0)}%
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            {isPartiallyFilled ? (
                              <>
                                <span className="text-blue-400">{executedShares.toLocaleString()}주 체결</span>
                                <span className="mx-2">•</span>
                                <span className="text-yellow-400">{remainingShares.toLocaleString()}주 대기</span>
                                <span className="mx-2">@</span>
                                {formatKoreanCurrency(Number(order.targetPrice))}
                              </>
                            ) : (
                              <>
                                {order.shares.toLocaleString()}주 @ {formatKoreanCurrency(Number(order.targetPrice))}
                                <span className="mx-2">•</span>
                                <span className="text-yellow-400">예약금: {formatKoreanCurrency(Number(order.reservedAmount))}</span>
                              </>
                            )}
                          </div>
                          {isPartiallyFilled && order.executedPrice && (
                            <div className="text-xs text-blue-400 mt-1">
                              평균 체결가: {formatKoreanCurrency(Number(order.executedPrice))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">
                          {formatKoreanCurrency(Number(order.totalAmount))}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {order.expiresAt ? `만료: ${format(new Date(order.expiresAt), 'MM/dd HH:mm', { locale: ko })}` : '무기한'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 거래 내역 */}
        <Card className="discord-bg-darker border-discord-dark lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <i className="fas fa-history text-purple-500"></i>
              <span>최근 거래 내역</span>
            </CardTitle>
            <CardDescription>지난 30일간의 입출금 내역</CardDescription>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="flex-1 min-w-[150px]">
                <Label className="text-gray-300 text-sm mb-1 block">거래 유형</Label>
                <select
                  value={transactionTypeFilter}
                  onChange={(e) => setTransactionTypeFilter(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-md px-3 py-2 text-white text-sm"
                >
                  <option value="all">전체</option>
                  <option value="deposit">입금</option>
                  <option value="withdraw">출금</option>
                  <option value="transfer">송금</option>
                  <option value="stock">주식</option>
                  <option value="tax">세금</option>
                </select>
              </div>
              
              <div className="flex-1 min-w-[150px]">
                <Label className="text-gray-300 text-sm mb-1 block">기간</Label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="w-full bg-discord-dark border border-discord-border rounded-md px-3 py-2 text-white text-sm"
                >
                  <option value="7d">최근 7일</option>
                  <option value="30d">최근 30일</option>
                  <option value="90d">최근 90일</option>
                  <option value="all">전체</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(transactionHistory as any)?.length > 0 ? (
                (transactionHistory as any[])
                  .filter((transaction: any) => {
                    // Type filter
                    if (transactionTypeFilter === 'all') return true;
                    
                    const txType = transaction.type;
                    if (transactionTypeFilter === 'deposit') {
                      return txType === 'transfer_in' || txType === 'initial_deposit' || txType === 'admin_deposit';
                    }
                    if (transactionTypeFilter === 'withdraw') {
                      return txType === 'transfer_out' || txType === 'admin_withdraw';
                    }
                    if (transactionTypeFilter === 'transfer') {
                      return txType === 'transfer_in' || txType === 'transfer_out';
                    }
                    if (transactionTypeFilter === 'stock') {
                      return txType === 'stock_buy' || txType === 'stock_sell';
                    }
                    if (transactionTypeFilter === 'tax') {
                      return txType === 'tax';
                    }
                    return false;
                  })
                  .filter((transaction: any) => {
                    // Date range filter
                    if (dateRangeFilter === 'all') return true;
                    
                    const txDate = new Date(transaction.createdAt);
                    const now = new Date();
                    const daysAgo = parseInt(dateRangeFilter.replace('d', ''));
                    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
                    
                    return txDate >= cutoffDate;
                  })
                  .map((transaction: any, index: number) => {
                  const isReceive = transaction.type === 'transfer_in' || transaction.type === 'initial_deposit' || transaction.type === 'admin_deposit' || transaction.type === 'stock_sell';
                  const amount = Number(transaction.amount);
                  
                  return (
                    <div key={transaction.id || index} className="flex items-center justify-between p-3 bg-discord-dark rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isReceive ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                        }`}>
                          <i className={`fas ${isReceive ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {transaction.memo || transaction.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-400">
                            {new Date(transaction.createdAt).toLocaleString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold ${
                        isReceive ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isReceive ? '+' : ''}{formatKoreanCurrency(amount)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <i className="fas fa-file-alt text-4xl mb-4 opacity-50"></i>
                  <p>거래 내역이 없습니다.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
        </div>
      </div>
    </div>
  );
}