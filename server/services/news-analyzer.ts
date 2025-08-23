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
    const maxImpactPct = Number(settings?.newsMaxImpactPct || 15) / 100;
    
    // Calculate price impact with deadzone
    let priceImpact = 0;
    if (Math.abs(sentimentScore) >= 0.03) {
      priceImpact = Math.min(Math.max(sentimentScore * maxImpactPct, -maxImpactPct), maxImpactPct);
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
      createdBy
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
}
