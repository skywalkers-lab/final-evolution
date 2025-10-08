# 주식 시장 시스템 개선 - 호가창 및 실시간 체결 시스템

## 📊 개요

실제 주식 시장과 동일한 논리로 작동하는 호가창(Order Book) 및 시장 깊이(Market Depth) 시스템을 구현했습니다.

## 🎯 주요 기능

### 1. 호가창 시스템 (Order Book)

#### 데이터베이스 스키마
```typescript
// order_book 테이블
- guildId: 서버 ID
- symbol: 종목 심볼
- side: 'buy' | 'sell' (매수/매도)
- price: 가격 (decimal)
- quantity: 수량
- unique constraint: (guildId, symbol, side, price)
```

#### 특징
- **실시간 호가 관리**: 각 가격대별 매수/매도 수량 추적
- **자동 체결**: 주문 가격이 반대편 최우선 호가와 일치하면 즉시 체결
- **부분 체결**: 주문 수량이 호가 수량보다 많으면 여러 가격대에 걸쳐 체결
- **슬리피지 계산**: 실제 평균 체결가와 주문가의 차이를 계산

### 2. 시장 깊이 (Market Depth)

#### 데이터베이스 스키마
```typescript
// market_depth 테이블
- guildId: 서버 ID
- symbol: 종목 심볼
- bidPrices: JSONB [{price, quantity}, ...] // 매수 호가 배열
- askPrices: JSONB [{price, quantity}, ...] // 매도 호가 배열
- spread: 매수/매도 스프레드
- lastUpdated: 마지막 업데이트 시간
```

#### 특징
- **집계 데이터**: 호가창 데이터를 집계하여 시장 깊이 시각화
- **스프레드 추적**: 최우선 매수호가와 매도호가의 차이 계산
- **성능 최적화**: JSONB 타입으로 빠른 조회

### 3. 주문 매칭 엔진 (Order Matching)

#### 작동 방식

**매수 주문 처리**:
1. 호가창에서 가장 낮은 매도 호가부터 검색
2. 주문 가격보다 낮거나 같은 매도 호가와 체결
3. 수량이 부족하면 다음 가격대로 이동 (부분 체결)
4. 체결 후 남은 수량은 호가창에 매수 주문으로 등록

**매도 주문 처리**:
1. 호가창에서 가장 높은 매수 호가부터 검색
2. 주문 가격보다 높거나 같은 매수 호가와 체결
3. 수량이 부족하면 다음 가격대로 이동 (부분 체결)
4. 체결 후 남은 수량은 호가창에 매도 주문으로 등록

#### 코드 예시
```typescript
async executeOrderWithMatching(
  guildId: string,
  userId: string,
  symbol: string,
  side: 'buy' | 'sell',
  quantity: number,
  limitPrice: number
) {
  // 호가창 조회
  const orderBook = await this.storage.getOrderBook(guildId, symbol, 50);
  
  // 체결 가능한 주문 찾기
  for (const matchOrder of availableOrders) {
    const matchQuantity = Math.min(remainingQuantity, matchOrder.quantity);
    
    // 거래 실행
    await this.storage.executeTrade(...);
    
    // 호가창 업데이트
    await this.storage.updateOrderBook(...);
  }
  
  // 평균 체결가 및 슬리피지 계산
  return {
    averagePrice,
    totalQuantity,
    fills,
    slippage
  };
}
```

### 4. API 엔드포인트

#### 호가창 조회
```
GET /api/web-client/guilds/:guildId/stocks/:symbol/orderbook?depth=10
```

**응답 예시**:
```json
{
  "bids": [
    {"price": 10100, "quantity": 50},
    {"price": 10050, "quantity": 100}
  ],
  "asks": [
    {"price": 10200, "quantity": 75},
    {"price": 10250, "quantity": 120}
  ],
  "bestBid": 10100,
  "bestAsk": 10200,
  "spread": 100,
  "timestamp": "2025-01-22T10:30:00Z"
}
```

#### 시장 깊이 조회
```
GET /api/web-client/guilds/:guildId/stocks/:symbol/depth
```

**응답 예시**:
```json
{
  "guildId": "1284053249057620018",
  "symbol": "AAPL",
  "bidPrices": [
    {"price": 10100, "quantity": 50},
    {"price": 10050, "quantity": 100}
  ],
  "askPrices": [
    {"price": 10200, "quantity": 75},
    {"price": 10250, "quantity": 120}
  ],
  "spread": "100.00",
  "lastUpdated": "2025-01-22T10:30:00Z"
}
```

### 5. 프론트엔드 컴포넌트

#### OrderBook 컴포넌트
- **실시간 업데이트**: WebSocket으로 2초마다 자동 갱신
- **시각화**: 가격대별 수량을 바 차트로 표시
- **색상 구분**: 매수는 초록색, 매도는 빨간색
- **통계**: 총 매수/매도 수량, 스프레드 표시

#### MarketDepth 컴포넌트
- **차트 시각화**: Recharts로 시장 깊이 시각화
- **양방향 차트**: 매수는 위로, 매도는 아래로 표시
- **통계**: 매수/매도 비율, 총 수량 표시
- **자동 갱신**: 5초마다 업데이트

### 6. 실시간 통신

#### WebSocket 이벤트
```typescript
// 주문 체결 시
wsManager.broadcast('trade_executed', {
  averagePrice,
  totalQuantity,
  fills,
  slippage
});

// 호가창 업데이트 시
wsManager.broadcast('order_book_updated', {
  guildId,
  symbol,
  orderBook: { bids, asks }
});
```

## 🔧 구현 파일

### Backend
- `shared/schema.ts`: 데이터베이스 스키마 정의
- `server/storage.ts`: 호가창/시장 깊이 저장소 메서드
- `server/services/trading-engine.ts`: 주문 매칭 엔진
- `server/routes.ts`: API 엔드포인트

### Frontend
- `client/src/components/OrderBook.tsx`: 호가창 UI
- `client/src/components/MarketDepth.tsx`: 시장 깊이 차트
- `client/src/pages/dashboard.tsx`: 대시보드 통합

## 📈 실제 시장과의 비교

| 기능 | 실제 시장 | 이 시스템 | 상태 |
|------|----------|----------|------|
| 호가창 | ✅ | ✅ | 완료 |
| 체결 시스템 | ✅ | ✅ | 완료 |
| 시장 깊이 | ✅ | ✅ | 완료 |
| 슬리피지 | ✅ | ✅ | 완료 |
| 거래량 기반 가격 영향 | ✅ | ✅ | 이미 구현됨 |
| 호가 우선순위 (가격-시간) | ✅ | ⚠️ | 가격 우선만 구현 |
| 호가 잔량 표시 | ✅ | ✅ | 완료 |
| 체결 내역 | ✅ | ✅ | 완료 |

## 🎮 사용 예시

### Discord Bot에서
```
/주식매수 AAPL 10 10150
→ 호가창을 확인하여 10,100원에 5주, 10,150원에 5주 체결
→ 평균 체결가: 10,125원
→ 슬리피지: 0.25%
```

### 웹 대시보드에서
1. 종목 선택
2. 호가창에서 매수/매도 호가 실시간 확인
3. 시장 깊이 차트로 유동성 파악
4. 주문 실행 시 자동으로 최적가 체결

## 🚀 향후 개선 사항

1. **시간 우선 원칙**: 같은 가격의 주문은 먼저 들어온 순서대로 체결
2. **IOC/FOK 주문**: Immediate-or-Cancel, Fill-or-Kill 주문 타입
3. **Stop Loss/Take Profit**: 손절매/익절 자동 주문
4. **호가 통계**: 호가 변동 추이, 체결강도 지표
5. **알고리즘 트레이딩**: 자동매매 봇 지원

## ✅ 체크리스트

- [x] 호가창 데이터베이스 스키마
- [x] 시장 깊이 스냅샷 테이블
- [x] Storage 레이어 메서드
- [x] 주문 매칭 엔진
- [x] 슬리피지 계산
- [x] API 엔드포인트
- [x] OrderBook 컴포넌트
- [x] MarketDepth 컴포넌트
- [x] 대시보드 통합
- [x] WebSocket 실시간 업데이트

## 📝 참고

이 시스템은 실제 주식 시장의 호가창 메커니즘을 단순화하여 구현했습니다. 
FIFO(First In First Out) 원칙을 완벽하게 구현하려면 각 호가에 타임스탬프와 순서를 추가해야 하지만, 
현재 버전에서는 가격 우선 원칙만 적용하여 성능과 단순성의 균형을 맞췄습니다.
