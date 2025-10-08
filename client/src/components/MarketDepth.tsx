import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface PriceLevel {
  price: number;
  quantity: number;
}

interface MarketDepthData {
  id: string;
  guildId: string;
  symbol: string;
  bidPrices: PriceLevel[];
  askPrices: PriceLevel[];
  spread: string | null;
  lastUpdated: string;
}

interface MarketDepthProps {
  guildId: string;
  symbol: string;
}

export function MarketDepth({ guildId, symbol }: MarketDepthProps) {
  const { data, isLoading } = useQuery<MarketDepthData>({
    queryKey: [`/api/web-client/guilds/${guildId}/stocks/${symbol}/depth`],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>시장 깊이 (Market Depth)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (!data.bidPrices.length && !data.askPrices.length)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>시장 깊이 (Market Depth)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            아직 호가 데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data - combine bids and asks
  const chartData = [
    ...data.bidPrices.map(bid => ({
      price: bid.price,
      quantity: bid.quantity,
      type: 'bid',
      displayPrice: bid.price.toLocaleString('ko-KR', { minimumFractionDigits: 0 })
    })),
    ...data.askPrices.map(ask => ({
      price: ask.price,
      quantity: -ask.quantity, // Negative for visual separation
      type: 'ask',
      displayPrice: ask.price.toLocaleString('ko-KR', { minimumFractionDigits: 0 })
    }))
  ].sort((a, b) => a.price - b.price);

  const formatPrice = (price: number) => price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>시장 깊이 (Market Depth) - {symbol}</span>
          {data.spread && (
            <span className="text-sm font-normal text-muted-foreground">
              스프레드: {formatPrice(Number(data.spread))}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="displayPrice"
                label={{ value: '가격', position: 'insideBottom', offset: -5 }}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                label={{ value: '수량', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => Math.abs(value).toLocaleString()}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <div className="font-medium mb-1">
                          {data.type === 'bid' ? '매수' : '매도'}
                        </div>
                        <div className="text-sm">
                          <div>가격: {formatPrice(data.price)}</div>
                          <div>수량: {Math.abs(data.quantity).toLocaleString()}주</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                payload={[
                  { value: '매수 (Bids)', type: 'rect', color: '#22c55e' },
                  { value: '매도 (Asks)', type: 'rect', color: '#ef4444' }
                ]}
              />
              <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.type === 'bid' ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">총 매수</div>
            <div className="font-medium text-green-600">
              {data.bidPrices.reduce((sum, b) => sum + b.quantity, 0).toLocaleString()}주
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">총 매도</div>
            <div className="font-medium text-red-600">
              {data.askPrices.reduce((sum, a) => sum + a.quantity, 0).toLocaleString()}주
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">매수/매도 비율</div>
            <div className="font-medium">
              {(data.bidPrices.reduce((sum, b) => sum + b.quantity, 0) /
                Math.max(data.askPrices.reduce((sum, a) => sum + a.quantity, 0), 1)).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-muted-foreground text-center">
          마지막 업데이트: {new Date(data.lastUpdated).toLocaleTimeString('ko-KR')}
        </div>
      </CardContent>
    </Card>
  );
}
