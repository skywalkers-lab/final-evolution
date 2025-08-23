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

export default function BankPage() {
  const { user, selectedGuildId, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [memo, setMemo] = useState('');
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
                  ₩{Number((accountData as any)?.account?.balance || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">계좌 상태</span>
                <Badge variant="outline" className={`${(accountData as any)?.account?.frozen ? 'border-red-500 text-red-400' : 'border-green-500 text-green-400'}`}>
                  <i className={`fas ${(accountData as any)?.account?.frozen ? 'fa-lock' : 'fa-check-circle'} mr-1`}></i>
                  {(accountData as any)?.account?.frozen ? '동결' : '정상'}
                </Badge>
              </div>
            </div>

            <Button 
              className="w-full bg-discord-blue hover:bg-discord-blue/80" 
              data-testid="button-refresh-balance"
              onClick={() => refetchAccount()}
            >
              <i className="fas fa-sync-alt mr-2"></i>
              잔액 새로고침
            </Button>
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
              disabled={transferMutation.isPending}
            >
              <i className="fas fa-paper-plane mr-2"></i>
              {transferMutation.isPending ? '솨금 중...' : '송금하기'}
            </Button>
          </CardContent>
        </Card>

        {/* 거래 내역 */}
        <Card className="discord-bg-darker border-discord-dark lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <i className="fas fa-history text-purple-500"></i>
              <span>최근 거래 내역</span>
            </CardTitle>
            <CardDescription>지난 30일간의 입출금 내역</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(transactionHistory as any)?.length > 0 ? (
                (transactionHistory as any[]).map((transaction: any, index: number) => {
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
                        {isReceive ? '+' : '-'}₩{amount.toLocaleString()}
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