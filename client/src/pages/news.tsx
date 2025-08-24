import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";
import GuildSelector from "@/components/guild/guild-selector";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function NewsPage() {
  const { user, selectedGuildId, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');

  // Fetch news analyses
  const { data: newsAnalyses = [], refetch: refetchNews } = useQuery({
    queryKey: ['/api/guilds', selectedGuildId, 'news'],
    enabled: !!selectedGuildId,
    select: (data: any) => data || [],
  });

  // Fetch stocks for symbol selection
  const { data: stocks = [] } = useQuery({
    queryKey: ['/api/guilds', selectedGuildId, 'stocks'],
    enabled: !!selectedGuildId,
    select: (data: any) => data || [],
  });

  // WebSocket handler for real-time updates
  useWebSocket((event: string, data: any) => {
    switch (event) {
      case 'news_analyzed':
      case 'stock_price_updated':
        refetchNews();
        break;
    }
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  const handleAnalyzeNews = async () => {
    if (!newsTitle || !newsContent) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const analysisData = {
        title: newsTitle,
        content: newsContent,
        symbol: selectedSymbol || undefined,
      };

      await apiRequest('POST', `/api/guilds/${selectedGuildId}/news/analyze`, analysisData);

      toast({
        title: "뉴스 분석 완료",
        description: "뉴스 분석이 완료되었습니다.",
      });

      setIsAnalyzeDialogOpen(false);
      setNewsTitle('');
      setNewsContent('');
      setSelectedSymbol('');
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/guilds', selectedGuildId, 'news'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guilds', selectedGuildId, 'stocks'] });
    } catch (error: any) {
      toast({
        title: "뉴스 분석 실패",
        description: error.message || "뉴스 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "bg-green-900 text-green-300 border-green-500";
      case "negative": return "bg-red-900 text-red-300 border-red-500";
      default: return "bg-yellow-900 text-yellow-300 border-yellow-500";
    }
  };

  const getSentimentText = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "긍정";
      case "negative": return "부정";
      default: return "중립";
    }
  };

  const getImpactText = (priceImpact: number) => {
    const impact = Math.abs(priceImpact * 100);
    if (impact >= 5) return "높음";
    if (impact >= 2) return "중간";
    return "낮음";
  };

  const getImpactColor = (priceImpact: number) => {
    const impact = Math.abs(priceImpact * 100);
    if (impact >= 5) return "text-red-400";
    if (impact >= 2) return "text-yellow-400";
    return "text-gray-400";
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

  // Show guild selector if no guild is selected
  if (!selectedGuildId) {
    return <GuildSelector />;
  }

  // Calculate summary stats
  const totalNews = newsAnalyses.length;
  const positiveNews = newsAnalyses.filter((news: any) => news.sentiment === 'positive').length;
  const marketSentiment = totalNews > 0 ? Math.round((positiveNews / totalNews) * 100) : 0;

  return (
    <div className="flex h-screen overflow-hidden discord-bg-darkest text-gray-100 font-inter">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <main className="flex-1 overflow-y-auto p-6" data-testid="news-main">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">뉴스 분석</h1>
                <p className="text-gray-400 mt-1">실시간 시장 뉴스 및 감정 분석</p>
              </div>
              <div className="flex items-center space-x-4">
                <Dialog open={isAnalyzeDialogOpen} onOpenChange={setIsAnalyzeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-analyze-news">
                      <i className="fas fa-plus mr-2"></i>
                      뉴스 분석
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="discord-bg-darker border-discord-dark max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-white">뉴스 분석</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        뉴스 기사를 분석하여 시장 감정과 주가 영향을 예측합니다.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-white">뉴스 제목 *</Label>
                        <Input 
                          id="title"
                          value={newsTitle}
                          onChange={(e) => setNewsTitle(e.target.value)}
                          placeholder="뉴스 제목을 입력하세요"
                          className="bg-discord-dark border-discord-light text-white"
                          data-testid="input-news-title"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="content" className="text-white">뉴스 내용 *</Label>
                        <Textarea 
                          id="content"
                          value={newsContent}
                          onChange={(e) => setNewsContent(e.target.value)}
                          placeholder="뉴스 내용을 입력하세요"
                          rows={8}
                          className="bg-discord-dark border-discord-light text-white"
                          data-testid="input-news-content"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="symbol" className="text-white">영향 종목 (선택사항)</Label>
                        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                          <SelectTrigger className="bg-discord-dark border-discord-light text-white">
                            <SelectValue placeholder="특정 종목에만 영향을 주는 경우 선택" />
                          </SelectTrigger>
                          <SelectContent className="bg-discord-dark border-discord-light">
                            <SelectItem value="">전체 시장 영향</SelectItem>
                            {stocks.map((stock: any) => (
                              <SelectItem key={stock.symbol} value={stock.symbol}>
                                {stock.name} ({stock.symbol})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsAnalyzeDialogOpen(false)}
                        className="border-discord-light text-white hover:bg-discord-dark"
                      >
                        취소
                      </Button>
                      <Button 
                        onClick={handleAnalyzeNews}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-submit-news"
                      >
                        <i className="fas fa-brain mr-2"></i>
                        분석 시작
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-newspaper text-blue-500 text-2xl"></i>
                  <span className="text-blue-300 font-semibold">AI 분석</span>
                </div>
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
                    <div className="text-3xl font-bold text-green-400 mb-2">{marketSentiment}%</div>
                    <p className="text-gray-400">긍정적</p>
                    <div className="w-full bg-discord-dark rounded-full h-2 mt-3">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: `${marketSentiment}%`}}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="discord-bg-darker border-discord-dark">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <i className="fas fa-newspaper text-yellow-500"></i>
                    <span>분석된 뉴스</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">{totalNews}</div>
                    <p className="text-gray-400">건 분석 완료</p>
                    <div className="text-sm text-gray-500 mt-2">
                      {totalNews > 0 && newsAnalyses[0] ? 
                        `마지막 분석: ${new Date(newsAnalyses[0].createdAt).toLocaleString('ko-KR')}` : 
                        '분석된 뉴스가 없습니다'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="discord-bg-darker border-discord-dark">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <i className="fas fa-brain text-purple-500"></i>
                    <span>AI 분석</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">실시간</div>
                    <p className="text-gray-400">감정 분석</p>
                    <div className="text-sm text-gray-500 mt-2">한국은행 AI 모델</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 뉴스 리스트 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">분석된 뉴스</h2>
              
              {newsAnalyses.length > 0 ? (
                newsAnalyses.map((news: any) => (
                  <Card key={news.id} className="discord-bg-darker border-discord-dark">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-lg mb-2">{news.title}</CardTitle>
                          <CardDescription className="text-gray-300 line-clamp-3">
                            {news.content}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          <Badge variant="outline" className={getSentimentColor(news.sentiment)}>
                            {getSentimentText(news.sentiment)}
                          </Badge>
                          <div className="text-sm text-gray-400">
                            {new Date(news.createdAt).toLocaleDateString('ko-KR')} {new Date(news.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-400">
                            시장 영향: <span className={getImpactColor(Number(news.priceImpact))}>{getImpactText(Number(news.priceImpact))}</span>
                          </span>
                          {news.symbol && (
                            <Badge variant="secondary" className="bg-discord-dark text-gray-300">
                              {news.symbol}
                            </Badge>
                          )}
                        </div>
                        
                        {/* 가격 변동 정보 */}
                        {news.oldPrice && news.newPrice && (
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-400">가격 변동:</span>
                            <div className="flex items-center space-x-1">
                              <span className="text-sm text-white">₩{Number(news.oldPrice).toLocaleString()}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-sm text-white">₩{Number(news.newPrice).toLocaleString()}</span>
                              <span className={`text-sm font-medium ${
                                Number(news.newPrice) > Number(news.oldPrice) ? 'text-red-400' : 'text-blue-400'
                              }`}>
                                ({Number(news.priceImpact) > 0 ? '+' : ''}{(Number(news.priceImpact) * 100).toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 space-y-2">
                    <i className="fas fa-newspaper text-4xl"></i>
                    <p className="text-lg">분석된 뉴스가 없습니다</p>
                    <p className="text-sm">뉴스 분석 버튼을 클릭하여 새로운 뉴스를 분석해보세요!</p>
                  </div>
                </div>
              )}
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
                    <span className="text-gray-400">분석 뉴스 수</span>
                    <div className="text-white font-medium">{totalNews}건</div>
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
        </main>
      </div>
    </div>
  );
}