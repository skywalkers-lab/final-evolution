import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";

interface LatestNewsProps {
  guildId: string;
}

export default function LatestNews({ guildId }: LatestNewsProps) {
  const { data: newsData, refetch } = useQuery({
    queryKey: ['/api/web-client/guilds', guildId, 'news'],
    enabled: !!guildId,
    select: (data: any) => data || [],
  });

  // WebSocket handler for real-time news updates
  useWebSocket((event: string, data: any) => {
    if (event === 'news_analyzed') {
      refetch();
    }
  });

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '📈';
      case 'negative':
        return '📉';
      case 'neutral':
        return '📊';
      default:
        return '📰';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-400';
      case 'negative':
        return 'text-red-400';
      case 'neutral':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
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

  const newsAnalyses = Array.isArray(newsData) ? newsData.slice(0, 5) : [];

  return (
    <div className="discord-bg-darker rounded-xl border border-discord-dark">
      <div className="p-6 border-b border-discord-dark">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">최신 뉴스</h3>
          <div className="text-sm text-gray-400">AI 감정분석</div>
        </div>
      </div>
      
      <div className="p-6">
        {newsAnalyses.length > 0 ? (
          <div className="space-y-4">
            {newsAnalyses.map((news: any, index: number) => (
              <div 
                key={news.id}
                className="flex items-start space-x-3 p-3 bg-discord-dark rounded-lg hover:bg-discord-dark/70 transition-colors"
                data-testid={`news-item-${index}`}
              >
                <div className="flex-shrink-0 w-8 h-8 bg-discord-blue bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-sm">{getSentimentIcon(news.sentiment)}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium text-sm leading-tight mb-1" data-testid={`text-news-title-${index}`}>
                    {news.title}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className={`font-medium ${getSentimentColor(news.sentiment)}`}>
                      {news.sentiment === 'positive' ? '긍정' : 
                       news.sentiment === 'negative' ? '부정' : '중립'}
                    </span>
                    {news.symbol && (
                      <span className="bg-discord-blurple bg-opacity-20 text-discord-blurple px-2 py-0.5 rounded">
                        {news.symbol}
                      </span>
                    )}
                    <span className="text-gray-500">
                      {formatTime(news.createdAt)}
                    </span>
                  </div>
                  {news.priceImpact && Math.abs(Number(news.priceImpact) * 100) >= 1 && (
                    <div className="mt-1 text-xs text-gray-400">
                      <span>시장 영향: </span>
                      <span className={`font-medium ${
                        Math.abs(Number(news.priceImpact) * 100) >= 5 ? 'text-red-400' :
                        Math.abs(Number(news.priceImpact) * 100) >= 2 ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {Math.abs(Number(news.priceImpact) * 100) >= 5 ? '높음' :
                         Math.abs(Number(news.priceImpact) * 100) >= 2 ? '중간' : '낮음'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            최신 뉴스가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}