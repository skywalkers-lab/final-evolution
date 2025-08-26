// 한국식 원화 표기를 위한 유틸리티 함수
export function formatKoreanCurrency(amount: number): string {
  if (amount === 0) return '0원';
  
  const units = [
    { value: 100000000, unit: '억' },
    { value: 10000, unit: '만' },
    { value: 1000, unit: '천' }
  ];
  
  const parts: string[] = [];
  let remaining = Math.floor(Math.abs(amount));
  
  for (const { value, unit } of units) {
    const count = Math.floor(remaining / value);
    if (count > 0) {
      parts.push(`${count}${unit}`);
      remaining %= value;
    }
  }
  
  // 마지막 남은 원 단위
  if (remaining > 0) {
    parts.push(`${remaining}원`);
  } else if (parts.length > 0) {
    parts.push('원');
  }
  
  const result = parts.join(' ');
  return amount < 0 ? `-${result}` : result;
}

// 간단한 원화 표기 (기존 방식과 호환)
export function formatSimpleCurrency(amount: number): string {
  return `₩${amount.toLocaleString()}`;
}