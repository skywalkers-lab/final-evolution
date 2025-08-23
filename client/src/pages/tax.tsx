import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";

export default function TaxPage() {
  const { user, selectedGuildId, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // 실제 길드 설정 데이터 가져오기
  const { data: guildSettings } = useQuery({
    queryKey: ['/api/guilds', selectedGuildId, 'settings'],
    enabled: !!selectedGuildId,
  });

  // 실제 계좌 데이터 가져오기
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/guilds', selectedGuildId, 'accounts'],
    enabled: !!selectedGuildId,
  });

  // 실제 거래 내역 데이터 가져오기
  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/guilds', selectedGuildId, 'transactions'],
    enabled: !!selectedGuildId,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  // 실제 데이터를 기반으로 세금 계산
  const calculateTaxData = () => {
    const accountList = Array.isArray(accounts) ? accounts : [];
    const totalBalance = accountList.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);
    const taxRate = Number((guildSettings as any)?.taxRate || 15);
    const estimatedTax = Math.floor(totalBalance * (taxRate / 100));

    return {
      currentMonth: {
        totalIncome: totalBalance,
        taxableIncome: totalBalance,
        taxRate,
        estimatedTax,
        paidTax: 0,
        dueDate: "매월 말일"
      },
      previousMonths: [
        { month: "이전 징수 기록", income: 0, tax: 0, status: "없음" },
      ],
      yearlyStats: {
        totalIncome: totalBalance,
        totalTax: estimatedTax,
        averageRate: taxRate,
        nextDue: estimatedTax
      }
    };
  };

  const taxData = selectedGuildId ? calculateTaxData() : {
    currentMonth: {
      totalIncome: 0,
      taxableIncome: 0,
      taxRate: 0,
      estimatedTax: 0,
      paidTax: 0,
      dueDate: "서버를 선택하세요"
    },
    previousMonths: [],
    yearlyStats: {
      totalIncome: 0,
      totalTax: 0,
      averageRate: 0,
      nextDue: 0
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "완납": return "bg-green-900 text-green-300 border-green-500";
      case "연체": return "bg-red-900 text-red-300 border-red-500";
      default: return "bg-yellow-900 text-yellow-300 border-yellow-500";
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  }

  if (!selectedGuildId) {
    return (
      <div className="flex min-h-screen discord-bg">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">서버를 선택하세요</h2>
              <p className="text-gray-400">좌측 사이드바에서 서버를 선택하여 세금 관리를 시작하세요.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen discord-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">세금 관리</h1>
          <p className="text-gray-400 mt-1">월별 소득세 및 세무 관리 시스템</p>
        </div>
        <div className="flex items-center space-x-2">
          <i className="fas fa-coins text-yellow-500 text-2xl"></i>
          <span className="text-yellow-300 font-semibold">자동 징수</span>
        </div>
      </div>

      {/* 이번 달 세금 현황 */}
      <Card className="discord-bg-darker border-discord-dark">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="fas fa-calendar-alt text-blue-500"></i>
              <span>2025년 1월 세금 현황</span>
            </div>
            <Badge variant="outline" className="border-yellow-500 text-yellow-400">
              미납
            </Badge>
          </CardTitle>
          <CardDescription>매월 말일 자동 징수됩니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-discord-dark rounded-lg">
              <div className="text-sm text-gray-400 mb-1">총 소득</div>
              <div className="text-xl font-bold text-white">₩{taxData.currentMonth.totalIncome.toLocaleString()}</div>
            </div>
            <div className="text-center p-4 bg-discord-dark rounded-lg">
              <div className="text-sm text-gray-400 mb-1">과세 소득</div>
              <div className="text-xl font-bold text-white">₩{taxData.currentMonth.taxableIncome.toLocaleString()}</div>
            </div>
            <div className="text-center p-4 bg-discord-dark rounded-lg">
              <div className="text-sm text-gray-400 mb-1">세율</div>
              <div className="text-xl font-bold text-yellow-400">{taxData.currentMonth.taxRate}%</div>
            </div>
            <div className="text-center p-4 bg-discord-dark rounded-lg">
              <div className="text-sm text-gray-400 mb-1">예상 세액</div>
              <div className="text-xl font-bold text-red-400">₩{taxData.currentMonth.estimatedTax.toLocaleString()}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">세금 납부 진행률</span>
              <span className="text-white">₩{taxData.currentMonth.paidTax.toLocaleString()} / ₩{taxData.currentMonth.estimatedTax.toLocaleString()}</span>
            </div>
            <Progress value={0} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">납부 마감: {taxData.currentMonth.dueDate}</span>
              <span className="text-yellow-400">{Math.ceil((new Date('2025-02-28').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}일 남음</span>
            </div>
          </div>

          <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-300 mb-2">
              <i className="fas fa-exclamation-triangle"></i>
              <span className="font-semibold">자동 징수 알림</span>
            </div>
            <p className="text-sm text-yellow-200">매월 말일 오전 9시에 자동으로 세금이 계좌에서 차감됩니다. 잔액 부족 시 연체료가 부과될 수 있습니다.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 납세 내역 */}
        <Card className="discord-bg-darker border-discord-dark">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <i className="fas fa-history text-purple-500"></i>
              <span>최근 납세 내역</span>
            </CardTitle>
            <CardDescription>지난 3개월간의 세금 납부 기록</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taxData.previousMonths.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-discord-dark rounded-lg">
                  <div>
                    <div className="text-white font-medium">{record.month}</div>
                    <div className="text-sm text-gray-400">소득: ₩{record.income.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">₩{record.tax.toLocaleString()}</div>
                    <Badge variant="outline" className={getStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 연간 통계 */}
        <Card className="discord-bg-darker border-discord-dark">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <i className="fas fa-chart-bar text-green-500"></i>
              <span>2024년 연간 통계</span>
            </CardTitle>
            <CardDescription>올해 세무 요약 정보</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">₩{taxData.yearlyStats.totalIncome.toLocaleString()}</div>
                <div className="text-sm text-gray-400">연간 총 소득</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">₩{taxData.yearlyStats.totalTax.toLocaleString()}</div>
                <div className="text-sm text-gray-400">연간 납부 세액</div>
              </div>
            </div>

            <div className="text-center p-4 bg-discord-dark rounded-lg">
              <div className="text-3xl font-bold text-yellow-400 mb-1">{taxData.yearlyStats.averageRate}%</div>
              <div className="text-sm text-gray-400">평균 세율</div>
            </div>

            <div className="space-y-2">
              <Button className="w-full bg-green-600 hover:bg-green-700" data-testid="button-tax-report">
                <i className="fas fa-file-alt mr-2"></i>
                연간 세무 보고서 다운로드
              </Button>
              <Button className="w-full bg-discord-blue hover:bg-discord-blue/80" data-testid="button-tax-calculator">
                <i className="fas fa-calculator mr-2"></i>
                세금 계산기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 세금 제도 안내 */}
      <Card className="discord-bg-darker border-discord-dark">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <i className="fas fa-info-circle text-blue-500"></i>
            <span>한국은행 가상경제 세금 제도</span>
          </CardTitle>
          <CardDescription>세금 부과 및 징수 방식 안내</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-discord-dark rounded-lg">
              <div className="text-white font-semibold mb-2">📊 소득 구분</div>
              <div className="text-sm text-gray-400 space-y-1">
                <p>• 주식 거래 수익</p>
                <p>• 경매 판매 수익</p>
                <p>• 기타 가상경제 활동</p>
              </div>
            </div>
            <div className="p-4 bg-discord-dark rounded-lg">
              <div className="text-white font-semibold mb-2">💰 세율 체계</div>
              <div className="text-sm text-gray-400 space-y-1">
                <p>• 100만원 이하: 10%</p>
                <p>• 100만원 초과: 15%</p>
                <p>• 500만원 초과: 20%</p>
              </div>
            </div>
            <div className="p-4 bg-discord-dark rounded-lg">
              <div className="text-white font-semibold mb-2">📅 징수 시기</div>
              <div className="text-sm text-gray-400 space-y-1">
                <p>• 매월 말일 자동 징수</p>
                <p>• 잔액 부족 시 연체료 3%</p>
                <p>• 3개월 연체 시 계좌 동결</p>
              </div>
            </div>
          </div>
          
          <div className="pt-3 border-t border-discord-dark text-center">
            <div className="flex items-center justify-center space-x-2 text-sm text-yellow-300">
              <i className="fas fa-university"></i>
              <span>한국은행 종합서비스센터 세무 관리 시스템</span>
            </div>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}