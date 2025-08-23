import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function BankPage() {
  const { user, selectedGuildId } = useAuth();
  const [amount, setAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');

  return (
    <div className="flex-1 p-6 space-y-6">
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
                <span className="text-white font-mono">3333-01-{user?.id?.slice(-6) || '123456'}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">현재 잔액</span>
                <span className="text-2xl font-bold text-green-400">₩1,000,000</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">계좌 상태</span>
                <Badge variant="outline" className="border-green-500 text-green-400">
                  <i className="fas fa-check-circle mr-1"></i>
                  정상
                </Badge>
              </div>
            </div>

            <Button className="w-full bg-discord-blue hover:bg-discord-blue/80" data-testid="button-refresh-balance">
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
              <Label htmlFor="transferTo" className="text-white">받는 사람</Label>
              <Input 
                id="transferTo"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="사용자 ID 또는 @멘션"
                className="bg-discord-dark border-discord-light text-white"
                data-testid="input-transfer-to"
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
            <Button className="w-full bg-green-600 hover:bg-green-700" data-testid="button-transfer">
              <i className="fas fa-paper-plane mr-2"></i>
              송금하기
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
              {[
                { type: 'receive', amount: 50000, from: '미니언#bello', time: '1시간 전', desc: '주식 매도' },
                { type: 'send', amount: 25000, to: 'TradingBot', time: '2시간 전', desc: '주식 매수' },
                { type: 'receive', amount: 100000, from: '시스템', time: '1일 전', desc: '월급 지급' },
              ].map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-discord-dark rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'receive' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                    }`}>
                      <i className={`fas ${transaction.type === 'receive' ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {transaction.type === 'receive' ? `${transaction.from}에서 받음` : `${transaction.to}로 보냄`}
                      </p>
                      <p className="text-sm text-gray-400">{transaction.desc} • {transaction.time}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${
                    transaction.type === 'receive' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {transaction.type === 'receive' ? '+' : '-'}₩{transaction.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}