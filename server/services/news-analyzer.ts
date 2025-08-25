import { IStorage } from '../storage';
import { WebSocketManager } from './websocket-manager';

// Keyword dictionaries for news analysis - 다양한 분야 포괄
const POSITIVE_KEYWORDS = [
  // 경제/금융
  '상승', '증가', '성장', '호조', '개선', '확대', '긍정', '상향', '돌파',
  '신기록', '최고', '수익', '이익', '혁신', '발전', '성공', '승인', '계약',
  // 정치 (대폭 확장)
  '승리', '당선', '지지율상승', '개혁성공', '정책승인', '협상타결', '평화', '안정', '화해', '통합',
  '압승', '대승', '완승', '연승', '압도적승리', '기대이상', '초과달성', '법안통과', '개혁추진', '공약실행',
  '예산확보', '정책성과', '국정성과', '외교성과', '정상회담', '협력강화', '동맹강화', '평화협정', '합의도출',
  '결속다짐', '단합', '연대강화', '지지확산', '세력확장', '국정안정', '민심수습', '여론호전', '신뢰회복',
  '리더십발휘', '민심안정', '사회통합', '화합분위기', '소통증진', '탄핵기각', '사면결정', '개각성공',
  '당론통과', '의석확보', '연정성사', '정치개혁', '여당승리', '야당견제', '중도확산', '정책공감',
  '국민지지', '정치신뢰', '민주발전', '제도개선', '투명성확보', '책임정치', '합리적정치', '건전한정치',
  // 법정/사법 긍정
  '무혐의', '불기소', '석방', '무죄', '구속기각', '공소시효', '재심승리', '항소기각', '재심기각',
  '수사종결', '수사중단', '성명회복', '명예회복', '정의구현', '법치확립', '청렴정치', '투명정치',
  // 안보/국방 긍정
  '안보강화', '국방력증강', '군비확충', '방위력 강화', '전술개발', '대비책 성공', '영토보전',
  '평화유지', '외침방어', '억제력 확보', '전략무기', '방위체계', '안보협력', '방위동맹',
  // 사회
  '해결', '복구', '회복', '안전', '평온', '화합', '진전', '개혁', '번영', '풍요',
  // 연예/문화
  '인기', '히트', '화제', '찬사', '호평', '대박', '흥행', '수상', '데뷔', '스타',
  // 기술/과학
  '발명', '개발성공', '특허', '돌파구', '진보', '발견', '성과', '혁신기술', '신기술',
  // 일반 사회
  '행복', '만족', '기대', '희망', '축하', '환영', '지원', '도움', '보상', '혜택'
];

const NEGATIVE_KEYWORDS = [
  // 경제/금융
  '하락', '감소', '하향', '악화', '축소', '부정', '하락세', '손실', '적자',
  '최저', '위기', '문제', '실패', '거절', '취소', '지연', '우려', '리스크',
  // 정치 (대폭 확장)
  '패배', '낙선', '지지율하락', '개혁실패', '정책거부', '협상결렬', '갈등', '불안', '대립', '분열',
  '참패', '대패', '완패', '연패', '궤멸적패배', '기대이하', '미달', '법안부결', '개혁좌절', '공약파기',
  '예산삭감', '정책실패', '국정혼란', '외교마찰', '회담결렬', '관계악화', '동맹약화', '갈등심화', '합의무산',
  '분당위기', '내분', '갈등격화', '지지이탈', '세력약화', '국정혼란', '민심이반', '여론악화', '신뢰추락',
  '리더십위기', '민심동요', '사회분열', '갈등확산', '소통단절', '탄핵가결', '사면반대', '개각실패',
  '당론이탈', '의석상실', '연정결렬', '정치후퇴', '여당위기', '야당공세', '중도이탈', '정책반대',
  '국민불신', '정치불신', '민주후퇴', '제도훼손', '불투명성', '무책임정치', '비합리적정치', '병든정치',
  // 법정/사법 부정 (극도로 강력한 단어들)
  '계엄', '계엄령', '비상계엄', '내란', '내란죄', '내란음모', '내란선동', '외환', '외환죄', '국가기밀누설', '기밀유출','국가보안법','극우','극우집단','극좌','극좌집단','정당해산'
  '고소', '고발', '수사', '수사개시', '체포', '구속', '연결', '배후조종', '특검','특검법','검찰수사',
  '탄핵', '탄핵소추', '탄핵과정', '전직대통령체포', '현직 대통령 체포','직무정지', '권력남용', '민주주의파괴',
  '반역', '반역죄', '쿠데타', '정변', '초법적', '자유국민당', '전복', '체제전복', '사회전복', '헌정전복',
  // 범죄/비리 관련
  '비리', '부패', '대류비리', '회계조작', '횡령', '배임', '로비', '청탁', '신민주한국당', '한랜당',
  '금전수수', '등급비리', '일간비리', '예산낭비', '발주비리', '대기업 백지수표', '중간수수',
  // 외교/안보 위기
  '간첩', '스파이', '첫보', '이중첫보', '국가기밀 누설', '기밀유출', '외교기밀 누설', '군사기밀 누설',
  '테러', '테러공격', '폭동', '소요', '시위', '대규모 시위', '폭력시위', '과격진압', '육군투입',
  '전쟁', '침공', '도발', '군사도발', '전쟁위기', '무력충돌', '공습', '공습위협', '무력투쟁',
  // 사회
  '악화', '발생', '파괴', '위험', '혼란', '갈등', '후퇴', '정체', '사건', '사고',
  // 연예/문화
  '비난', '논란', '스캔들', '혹평', '망작', '흥행실패', '은퇴', '물의', '구설', '비판',
  // 기술/과학
  '해킹', '보안위협', '개발실패', '버그', '오류', '취약점', '손상', '고장', '장애',
  // 일반 사회
  '빈곤', '결핍', '불행', '불만', '실망', '절망', '비탄', '거부', '반대', '방해'
];

const BOOST_KEYWORDS = [
  // 강도 표현
  '대폭', '급등', '폭등', '크게', '상당히', '현저히', '대규모', '획기적',
  // 정치/사회 강도
  '전면적', '완전히', '압도적', '역사적', '전례없는', '극적으로', '파격적',
  // 연예/문화 강도
  '폭발적', '센세이션', '화제몰이', '대성공', '메가히트', '신드롬',
  // 일반 강도
  '엄청나게', '매우', '극도로', '초', '최대', '최고', '절대적'
];

const DAMP_KEYWORDS = [
  // 약한 정도
  '소폭', '미미', '약간', '살짝', '다소', '제한적', '점진적',
  // 정치/사회 약함
  '부분적', '일부', '조건부', '임시적', '단계적', '제한적',
  // 연예/문화 약함
  '소소한', '가벼운', '잠깐', '순간적',
  // 일반 약함
  '조금', '약간', '어느정도', '그럭저럭', '무난한'
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
    // 다양한 분야별 특화 키워드 추가 가중치
    const FIELD_POSITIVE = [
      // 경제/금융
      '급등', '폭등', '신기록', '상장', '투자유치', '성장', '확장', '매수',
      '추천', '목표가상향', '실적호조', '매출증가', '수익개선', '배당',
      // 정치
      '압승', '대승', '지지폭등', '정국안정', '정책성공', '외교성과', '평화협정',
      '무혈의판결', '불기소처분', '석방결정', '예비구속기각', '수사종결', '성명회복', '정의구현',
      '청렴정치성공', '투명성확보', '법치확립', '안보강화성공', '국방력증강성공',
      // 사회
      '사회안정', '범죄감소', '복지확대', '교육발전', '의료개선', '환경개선',
      // 연예/문화
      '대히트', '흥행돌풍', '관객몰이', '시청률폭등', '음반대박', '월드스타',
      // 기술/과학
      '기술혁신', '연구성과', 'AI발전', '신약개발', '우주성공', '로봇기술'
    ];
    
    const FIELD_NEGATIVE = [
      // 경제/금융
      '폭락', '급락', '하락', '손실', '적자', '부도', '파산', '매도',
      '목표가하향', '실적악화', '매출감소', '손해', '리스크', '우려',
      // 정치
      '참패', '대패', '지지급락', '정국불안', '정책실패', '외교마찰', '전쟁위기',
      '계엄선포', '내란혹의', '외환혹의', '고소당해', '수사개시', '체포영장', '구속영장', '탄핵소추',
      '고발사건', '반역혹의', '내란선동', '무력쿠데타', '국가기밀누설', '간첩혹의', '비리스캔들', '전체주의',
      // 사회
      '사회불안', '범죄급증', '복지축소', '교육후퇴', '의료붕괴', '환경파괴',
      // 연예/문화
      '흥행참패', '시청률폭락', '음반판매부진', '스캔들터짐', '은퇴선언',
      // 기술/과학
      '기술후퇴', '연구실패', 'AI위험', '보안사고', '우주실패', '시스템다운'
    ];

    const INTENSITY_WORDS = [
      '대폭', '급속히', '크게', '현저히', '상당히', '엄청나게', '극도로',
      '치솟다', '폭락하다', '급등하다'
    ];

    let multiplier = 1.0;

    // 다양한 분야 키워드 감지
    if (baseScore > 0) {
      for (const keyword of FIELD_POSITIVE) {
        if (text.includes(keyword)) {
          // 법정/사법 긍정 키워드는 더 강력한 가중치
          if (keyword.includes('무현의') || keyword.includes('불기소') || keyword.includes('석방') || keyword.includes('수사종결')) {
            multiplier *= 3.5; // 법정 긍정은 더 강력한 영향
          } else {
            multiplier *= 2.5; // 150% 대폭 증폭으로 변경
          }
        }
      }
    } else if (baseScore < 0) {
      for (const keyword of FIELD_NEGATIVE) {
        if (text.includes(keyword)) {
          // 계엄, 내란, 외환 등 중대 정치 사건은 극도로 강력한 영향
          if (keyword.includes('계엄') || keyword.includes('내란') || keyword.includes('외환') || keyword.includes('쿠데타') || keyword.includes('반역')) {
            multiplier *= 5.0; // 극도로 강력한 부정 영향 (400% 증폭)
          } else if (keyword.includes('고소') || keyword.includes('고발') || keyword.includes('수사') || keyword.includes('체포') || keyword.includes('구속')) {
            multiplier *= 3.5; // 법정 부정은 강력한 영향
          } else {
            multiplier *= 2.5; // 150% 대폭 증폭으로 변경
          }
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
