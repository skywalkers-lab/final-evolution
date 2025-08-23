import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function NewsPage() {
  const { selectedGuildId } = useAuth();

  const newsData = [
    {
      id: 1,
      title: "한국은행, 기준금리 3.50% 유지 결정",
      summary: "한국은행 금융통화위원회가 기준금리를 현 수준인 연 3.50%로 유지하기로 결정했다고 발표했습니다.",
      sentiment: "중립",
      impact: "낮음",
      time: "2시간 전",
      category: "통화정책",
      stockImpact: [
        { symbol: "KOSPI", change: "+0.2%" },
        { symbol: "KOSDAQ", change: "+0.1%" }
      ]
    },
    {
      id: 2,
      title: "삼성전자, AI 반도체 신제품 발표",
      summary: "삼성전자가 차세대 AI 처리 전용 반도체를 공개하며 글로벌 AI 시장 공략에 나선다고 발표했습니다.",
      sentiment: "긍정",
      impact: "높음",
      time: "4시간 전",
      category: "기업뉴스",
      stockImpact: [
        { symbol: "005930", change: "+2.8%" },
        { symbol: "SK하이닉스", change: "+1.5%" }
      ]
    },
    {
      id: 3,
      title: "원/달러 환율 1,320원대 중반 거래",
      summary: "원/달러 환율이 미 연준의 통화정책 불확실성으로 1,320원대 중반에서 등락을 반복하고 있습니다.",
      sentiment: "중립",
      impact: "중간",
      time: "6시간 전",
      category: "외환",
      stockImpact: [
        { symbol: "USD/KRW", change: "+0.1%" }
      ]
    }
  ];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "긍정": return "bg-green-900 text-green-300 border-green-500";
      case "부정": return "bg-red-900 text-red-300 border-red-500";
      default: return "bg-yellow-900 text-yellow-300 border-yellow-500";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "높음": return "text-red-400";
      case "중간": return "text-yellow-400";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">뉴스 분석</h1>
          <p className="text-gray-400 mt-1">실시간 시장 뉴스 및 감정 분석</p>
        </div>
        <div className="flex items-center space-x-2">
          <i className="fas fa-newspaper text-blue-500 text-2xl"></i>
          <span className="text-blue-300 font-semibold">AI 분석</span>
        </div>
      </div>

      {/* 분석 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="discord-bg-darker border-discord-dark">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <i className="fas fa-chart-pie text-green-500"></i>
              <span>시장 심리</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">67%</div>
              <p className="text-gray-400">긍정적</p>
              <div className="w-full bg-discord-dark rounded-full h-2 mt-3">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '67%'}}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="discord-bg-darker border-discord-dark">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <i className="fas fa-newspaper text-yellow-500"></i>
              <span>오늘 뉴스</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">23</div>
              <p className="text-gray-400">건 분석 완료</p>
              <div className="text-sm text-gray-500 mt-2">마지막 업데이트: 2시간 전</div>
            </div>
          </CardContent>
        </Card>

        <Card className="discord-bg-darker border-discord-dark">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <i className="fas fa-trending-up text-red-500"></i>
              <span>예상 영향</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">+1.2%</div>
              <p className="text-gray-400">KOSPI 예상</p>
              <div className="text-sm text-gray-500 mt-2">AI 모델 예측</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 뉴스 리스트 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">최신 뉴스 분석</h2>
        
        {newsData.map((news) => (
          <Card key={news.id} className="discord-bg-darker border-discord-dark">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-white text-lg mb-2">{news.title}</CardTitle>
                  <CardDescription className="text-gray-300">{news.summary}</CardDescription>
                </div>
                <div className="flex flex-col items-end space-y-2 ml-4">
                  <Badge variant="outline" className={getSentimentColor(news.sentiment)}>
                    {news.sentiment}
                  </Badge>
                  <div className="text-sm text-gray-400">{news.time}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="bg-discord-dark text-gray-300">
                    {news.category}
                  </Badge>
                  <span className="text-sm text-gray-400">
                    시장 영향: <span className={getImpactColor(news.impact)}>{news.impact}</span>
                  </span>
                </div>
                
                {/* 주식 영향 */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-400">영향 종목:</span>
                  {news.stockImpact.map((stock, index) => (
                    <div key={index} className="flex items-center space-x-1">
                      <span className="text-sm text-white">{stock.symbol}</span>
                      <span className={`text-sm font-medium ${
                        stock.change.startsWith('+') ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {stock.change}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI 분석 정보 */}
      <Card className="discord-bg-darker border-discord-dark">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <i className="fas fa-brain text-purple-500"></i>
            <span>AI 분석 모델 정보</span>
          </CardTitle>
          <CardDescription>뉴스 감정 분석 및 시장 예측 모델</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">분석 정확도</span>
              <div className="text-white font-medium">89.3%</div>
            </div>
            <div>
              <span className="text-gray-400">처리 속도</span>
              <div className="text-white font-medium">&lt; 1초</div>
            </div>
            <div>
              <span className="text-gray-400">데이터 소스</span>
              <div className="text-white font-medium">15개 매체</div>
            </div>
            <div>
              <span className="text-gray-400">업데이트</span>
              <div className="text-white font-medium">실시간</div>
            </div>
          </div>
          
          <div className="pt-3 border-t border-discord-dark">
            <div className="flex items-center justify-center space-x-2 text-sm text-yellow-300">
              <i className="fas fa-university"></i>
              <span>한국은행 종합서비스센터 AI 뉴스 분석 시스템</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}