/**
 * 기술적 지표 계산 유틸리티
 * Technical Indicators for Stock Analysis
 */

interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

/**
 * 단순 이동평균선 (Simple Moving Average)
 * @param data - 캔들스틱 데이터 배열
 * @param period - 기간 (예: 5, 20, 60, 120일)
 */
export function calculateSMA(data: CandleData[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN); // 데이터 부족
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    sma.push(sum / period);
  }
  
  return sma;
}

/**
 * 지수 이동평균선 (Exponential Moving Average)
 * @param data - 캔들스틱 데이터 배열
 * @param period - 기간
 */
export function calculateEMA(data: CandleData[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // 첫 EMA는 SMA로 시작
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i].close;
  }
  ema[period - 1] = sum / period;
  
  // 이후 EMA 계산
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i].close - ema[i - 1]) * multiplier + ema[i - 1];
    ema[i] = currentEMA;
  }
  
  // 초기 NaN 채우기
  for (let i = 0; i < period - 1; i++) {
    ema[i] = NaN;
  }
  
  return ema;
}

/**
 * RSI (Relative Strength Index) - 상대강도지수
 * @param data - 캔들스틱 데이터 배열
 * @param period - 기간 (일반적으로 14)
 */
export function calculateRSI(data: CandleData[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // 가격 변화 계산
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // 초기 평균 계산
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period && i < gains.length; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;
  
  rsi[0] = NaN; // 첫 번째 값
  
  // RSI 계산
  for (let i = period; i < data.length; i++) {
    const rs = avgGain / (avgLoss || 0.0001); // 0으로 나누기 방지
    const currentRSI = 100 - (100 / (1 + rs));
    rsi[i] = currentRSI;
    
    // 다음 평균 계산 (평활화)
    if (i < gains.length) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }
  }
  
  // 초기 NaN 채우기
  for (let i = 1; i < period; i++) {
    rsi[i] = NaN;
  }
  
  return rsi;
}

/**
 * MACD (Moving Average Convergence Divergence)
 * @param data - 캔들스틱 데이터 배열
 * @param fastPeriod - 빠른 EMA 기간 (일반적으로 12)
 * @param slowPeriod - 느린 EMA 기간 (일반적으로 26)
 * @param signalPeriod - 시그널 라인 기간 (일반적으로 9)
 */
export function calculateMACD(
  data: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // MACD Line = Fast EMA - Slow EMA
  const macd: number[] = [];
  for (let i = 0; i < data.length; i++) {
    macd.push(fastEMA[i] - slowEMA[i]);
  }
  
  // Signal Line = MACD의 EMA
  const macdData: CandleData[] = data.map((d, i) => ({
    ...d,
    close: macd[i] || 0
  }));
  const signal = calculateEMA(macdData, signalPeriod);
  
  // Histogram = MACD - Signal
  const histogram: number[] = [];
  for (let i = 0; i < data.length; i++) {
    histogram.push(macd[i] - signal[i]);
  }
  
  return { macd, signal, histogram };
}

/**
 * 볼린저 밴드 (Bollinger Bands)
 * @param data - 캔들스틱 데이터 배열
 * @param period - 기간 (일반적으로 20)
 * @param stdDev - 표준편차 배수 (일반적으로 2)
 */
export function calculateBollingerBands(
  data: CandleData[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    
    // 표준편차 계산
    let sumSquares = 0;
    for (let j = 0; j < period; j++) {
      const diff = data[i - j].close - middle[i];
      sumSquares += diff * diff;
    }
    const standardDeviation = Math.sqrt(sumSquares / period);
    
    upper.push(middle[i] + (standardDeviation * stdDev));
    lower.push(middle[i] - (standardDeviation * stdDev));
  }
  
  return { upper, middle, lower };
}

/**
 * 스토캐스틱 (Stochastic Oscillator)
 * @param data - 캔들스틱 데이터 배열
 * @param period - 기간 (일반적으로 14)
 * @param smoothK - %K 평활화 기간 (일반적으로 3)
 * @param smoothD - %D 평활화 기간 (일반적으로 3)
 */
export function calculateStochastic(
  data: CandleData[],
  period: number = 14,
  smoothK: number = 3,
  smoothD: number = 3
): { k: number[]; d: number[] } {
  const rawK: number[] = [];
  
  // Raw %K 계산
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      rawK.push(NaN);
      continue;
    }
    
    let highest = data[i].high;
    let lowest = data[i].low;
    
    for (let j = 0; j < period; j++) {
      highest = Math.max(highest, data[i - j].high);
      lowest = Math.min(lowest, data[i - j].low);
    }
    
    const current = data[i].close;
    const k = ((current - lowest) / (highest - lowest || 0.0001)) * 100;
    rawK.push(k);
  }
  
  // %K (평활화된 Raw %K)
  const k: number[] = [];
  for (let i = 0; i < rawK.length; i++) {
    if (i < smoothK - 1 || isNaN(rawK[i])) {
      k.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < smoothK; j++) {
      sum += rawK[i - j] || 0;
    }
    k.push(sum / smoothK);
  }
  
  // %D (평활화된 %K)
  const d: number[] = [];
  for (let i = 0; i < k.length; i++) {
    if (i < smoothD - 1 || isNaN(k[i])) {
      d.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < smoothD; j++) {
      sum += k[i - j] || 0;
    }
    d.push(sum / smoothD);
  }
  
  return { k, d };
}

/**
 * ATR (Average True Range) - 평균 진폭
 * @param data - 캔들스틱 데이터 배열
 * @param period - 기간 (일반적으로 14)
 */
export function calculateATR(data: CandleData[], period: number = 14): number[] {
  const tr: number[] = [];
  const atr: number[] = [NaN]; // 첫 번째 값
  
  // True Range 계산
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    
    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    tr.push(trueRange);
  }
  
  // 첫 ATR은 TR의 평균
  let sum = 0;
  for (let i = 0; i < period && i < tr.length; i++) {
    sum += tr[i];
  }
  atr[period] = sum / period;
  
  // 이후 ATR 계산 (평활화)
  for (let i = period + 1; i < data.length; i++) {
    const prevATR = atr[i - 1];
    const currentTR = tr[i - 1];
    atr[i] = ((prevATR * (period - 1)) + currentTR) / period;
  }
  
  // 초기 NaN 채우기
  for (let i = 1; i < period; i++) {
    atr[i] = NaN;
  }
  
  return atr;
}

/**
 * 모든 기술적 지표 계산
 */
export function calculateAllIndicators(data: CandleData[]) {
  return {
    sma5: calculateSMA(data, 5),
    sma20: calculateSMA(data, 20),
    sma60: calculateSMA(data, 60),
    sma120: calculateSMA(data, 120),
    ema12: calculateEMA(data, 12),
    ema26: calculateEMA(data, 26),
    rsi: calculateRSI(data, 14),
    macd: calculateMACD(data, 12, 26, 9),
    bollingerBands: calculateBollingerBands(data, 20, 2),
    stochastic: calculateStochastic(data, 14, 3, 3),
    atr: calculateATR(data, 14),
  };
}
