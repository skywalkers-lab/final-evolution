import { IStorage } from '../storage';
import { WebSocketManager } from './websocket-manager';

// Keyword dictionaries for news analysis
const POSITIVE_KEYWORDS = [
  '상승', '증가', '성장', '호조', '개선', '확대', '긍정', '상향', '돌파',
  '신기록', '최고', '수익', '이익', '혁신', '발전', '성공', '승인', '계약'
];

const NEGATIVE_KEYWORDS = [
  '하락', '감소', '하향', '악화', '축소', '부정', '하락세', '손실', '적자',
  '최저', '위기', '문제', '실패', '거절', '취소', '지연', '우려', '리스크'
];

const BOOST_KEYWORDS = [
  '대폭', '급등', '폭등', '크게', '상당히', '현저히', '대규모', '획기적'
];

const DAMP_KEYWORDS = [
  '소폭', '미미', '약간', '살짝', '다소', '제한적', '점진적'
];

export class NewsAnalyzer {
  private storage: IStorage;
  private wsManager: WebSocketManager;

  constructor(storage: IStorage, wsManager: WebSocketManager) {
    this.storage = storage;
    this.wsManager = wsManager;
  }

  async analyzeNews(guildId: string, title: string, content: string, symbol?: string, createdBy?: string) {
    // Normalize text
    const normalizedText = this.normalizeText(`${title} ${content}`);
    
    // Calculate sentiment scores
    const positiveScore = this.calculateScore(normalizedText, POSITIVE_KEYWORDS);
    const negativeScore = this.calculateScore(normalizedText, NEGATIVE_KEYWORDS);
    const boostFactor = this.calculateMultiplier(normalizedText, BOOST_KEYWORDS, 1.5);
    const dampFactor = this.calculateMultiplier(normalizedText, DAMP_KEYWORDS, 0.7);
    
    // Apply context modifiers
    const contextModifier = Math.min(Math.max(boostFactor * dampFactor, 0.4), 1.6);
    const rawScore = (positiveScore - negativeScore) * contextModifier;
    
    // Apply tanh normalization
    const sentimentScore = this.tanh(rawScore / 6);
    
    // Determine sentiment
    let sentiment = 'neutral';
    if (sentimentScore > 0.12) sentiment = 'positive';
    else if (sentimentScore < -0.12) sentiment = 'negative';
    
    // Get guild settings for max impact
    const settings = await this.storage.getGuildSettings(guildId);
    const maxImpactPct = Number(settings?.newsMaxImpactPct || 50) / 100; // 기본값을 50%로 대폭 증가
    
    // Calculate price impact with EXTREME sensitivity for dramatic movements
    let priceImpact = 0;
    if (Math.abs(sentimentScore) >= 0.001) { // 훨씬 낮은 임계값으로 초민감 반응
      // 키워드별 가중치 적용 + 카테고리별 강화
      const enhancedScore = this.enhanceScoreBasedOnKeywords(normalizedText, sentimentScore);
      const categoryMultiplier = this.getCategoryMultiplier(title); // 말머리별 배율
      const finalScore = enhancedScore * categoryMultiplier;
      priceImpact = Math.min(Math.max(finalScore * maxImpactPct, -maxImpactPct), maxImpactPct);
    }
    
    let oldPrice, newPrice;
    
    // Apply to specific stock if specified
    if (symbol) {
      const stock = await this.storage.getStockBySymbol(guildId, symbol);
      if (stock && stock.status !== 'delisted') {
        oldPrice = Number(stock.price);
        newPrice = Math.max(Math.floor(oldPrice * (1 + priceImpact)), 1);
        
        if (newPrice !== oldPrice) {
          await this.storage.updateStockPrice(guildId, symbol, newPrice);
          
          // Broadcast price update
          this.wsManager.broadcast('stock_price_updated', {
            guildId,
            symbol,
            oldPrice,
            newPrice,
            changePercent: ((newPrice - oldPrice) / oldPrice) * 100,
            reason: 'news_analysis'
          });
        }
      }
    } else {
      // Apply to all stocks if no specific symbol
      const stocks = await this.storage.getStocksByGuild(guildId);
      const activeStocks = stocks.filter(s => s.status === 'active');
      
      for (const stock of activeStocks) {
        oldPrice = Number(stock.price);
        const stockNewPrice = Math.max(Math.floor(oldPrice * (1 + priceImpact)), 1);
        
        if (stockNewPrice !== oldPrice) {
          await this.storage.updateStockPrice(guildId, stock.symbol, stockNewPrice);
          
          this.wsManager.broadcast('stock_price_updated', {
            guildId,
            symbol: stock.symbol,
            oldPrice,
            newPrice: stockNewPrice,
            changePercent: ((stockNewPrice - oldPrice) / oldPrice) * 100,
            reason: 'news_analysis'
          });
        }
      }
    }
    
    // Get user by Discord ID for proper database reference
    let databaseUserId = null;
    if (createdBy) {
      const user = await this.storage.getUserByDiscordId(createdBy);
      if (user) {
        databaseUserId = user.id;
      }
    }

    // Save analysis to database
    const analysis = await this.storage.addNewsAnalysis({
      guildId,
      symbol,
      title,
      content,
      sentiment,
      sentimentScore: sentimentScore.toString(),
      priceImpact: priceImpact.toString(),
      oldPrice: oldPrice?.toString(),
      newPrice: newPrice?.toString(),
      createdBy: databaseUserId
    });
    
    return analysis;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w가-힣\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateScore(text: string, keywords: string[]): number {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    return score;
  }

  private calculateMultiplier(text: string, keywords: string[], factor: number): number {
    let multiplier = 1;
    for (const keyword of keywords) {
      const regex = new RegExp(keyword, 'gi');
      if (regex.test(text)) {
        multiplier *= factor;
      }
    }
    return multiplier;
  }

  private tanh(x: number): number {
    return Math.tanh(x);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  // 뉴스 키워드에 따른 감정 점수 강화
  private enhanceScoreBasedOnKeywords(text: string, baseScore: number): number {
    // 금융 특화 키워드 추가 가중치
    const FINANCIAL_POSITIVE = [
      '급등', '폭등', '신기록', '상장', '투자유치', '성장', '확장', '매수',
      '추천', '목표가상향', '실적호조', '매출증가', '수익개선', '배당'
    ];
    
    const FINANCIAL_NEGATIVE = [
      '폭락', '급락', '하락', '손실', '적자', '부도', '파산', '매도',
      '목표가하향', '실적악화', '매출감소', '손해', '리스크', '우려'
    ];

    const INTENSITY_WORDS = [
      '대폭', '급속히', '크게', '현저히', '상당히', '엄청나게', '극도로',
      '치솟다', '폭락하다', '급등하다'
    ];

    let multiplier = 1.0;

    // 금융 키워드 감지
    if (baseScore > 0) {
      for (const keyword of FINANCIAL_POSITIVE) {
        if (text.includes(keyword)) {
          multiplier *= 2.5; // 150% 대폭 증폭으로 변경
        }
      }
    } else if (baseScore < 0) {
      for (const keyword of FINANCIAL_NEGATIVE) {
        if (text.includes(keyword)) {
          multiplier *= 2.5; // 150% 대폭 증폭으로 변경
        }
      }
    }

    // 강도 단어 감지 - 극적인 효과
    for (const keyword of INTENSITY_WORDS) {
      if (text.includes(keyword)) {
        multiplier *= 3.0; // 200% 극대 증폭으로 변경
      }
    }

    // 최대 15배까지 증폭 가능 - 뉴스 임팩트 극대화
    return baseScore * Math.min(multiplier, 15.0);
  }

  // 뉴스 카테고리별 강도 배율 계산 (말머리 기반)
  private getCategoryMultiplier(title: string): number {
    // 말머리에 따른 임팩트 강도
    if (title.includes('[경제]') || title.includes('[Economy]')) {
      return 3.0; // 경제 뉴스는 3배 강력한 영향
    } else if (title.includes('[정치]') || title.includes('[Politics]')) {
      return 2.5; // 정치 뉴스는 2.5배 영향
    } else if (title.includes('[사회]') || title.includes('[Society]')) {
      return 2.0; // 사회 뉴스는 2배 영향
    } else if (title.includes('[연예]') || title.includes('[Entertainment]')) {
      return 1.5; // 연예 뉴스는 1.5배 영향
    }
    
    // 말머리가 없는 일반 뉴스도 기본 배율 적용
    return 2.0;
  }
}
