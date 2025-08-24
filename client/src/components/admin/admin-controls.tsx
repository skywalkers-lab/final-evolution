import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function AdminControls() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Stock management state
  const [newStock, setNewStock] = useState({
    symbol: '',
    name: '',
    price: '',
    totalShares: '1000000'
  });
  
  // Price adjustment state
  const [priceAdjustment, setPriceAdjustment] = useState({
    symbol: '',
    newPrice: '',
    changePercent: [0]
  });
  
  // News analysis state
  const [newsAnalysis, setNewsAnalysis] = useState({
    title: '',
    content: '',
    symbol: ''
  });
  
  // Auction creation state
  const [newAuction, setNewAuction] = useState({
    itemRef: '',
    itemType: 'text' as 'text' | 'stock',
    startPrice: '',
    buyoutPrice: '',
    duration: '60',
    minIncrement: '',
    extendSeconds: '300'
  });

  const { data: stocks } = useQuery({
    queryKey: ['/api/guilds', user?.guildId, 'stocks'],
    enabled: !!user?.guildId,
  });

  const { data: settings } = useQuery({
    queryKey: ['/api/guilds', user?.guildId, 'settings'],
    enabled: !!user?.guildId,
  });

  // Stock creation mutation
  const createStockMutation = useMutation({
    mutationFn: async (stockData: any) => {
      return await apiRequest('POST', `/api/guilds/${user!.guildId}/stocks`, stockData);
    },
    onSuccess: () => {
      toast({
        title: "주식 생성 성공",
        description: "새로운 주식이 생성되었습니다.",
      });
      setNewStock({ symbol: '', name: '', price: '', totalShares: '1000000' });
      queryClient.invalidateQueries({ queryKey: ['/api/guilds', user?.guildId, 'stocks'] });
    },
    onError: (error: any) => {
      toast({
        title: "주식 생성 실패",
        description: error.message || "주식 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Price adjustment mutation
  const adjustPriceMutation = useMutation({
    mutationFn: async (data: any) => {
      const stock = stocks.find((s: any) => s.symbol === data.symbol);
      if (!stock) throw new Error('종목을 찾을 수 없습니다');
      
      return await apiRequest('PATCH', `/api/stocks/${stock.id}`, {
        price: data.newPrice,
      });
    },
    onSuccess: () => {
      toast({
        title: "가격 조정 성공",
        description: "주식 가격이 조정되었습니다.",
      });
      setPriceAdjustment({ symbol: '', newPrice: '', changePercent: [0] });
      queryClient.invalidateQueries({ queryKey: ['/api/guilds', user?.guildId, 'stocks'] });
    },
    onError: (error: any) => {
      toast({
        title: "가격 조정 실패",
        description: error.message || "가격 조정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // News analysis mutation
  const analyzeNewsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/guilds/${user!.guildId}/news/analyze`, data);
    },
    onSuccess: () => {
      toast({
        title: "뉴스 분석 완료",
        description: "뉴스 분석이 완료되고 주가에 반영되었습니다.",
      });
      setNewsAnalysis({ title: '', content: '', symbol: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/guilds', user?.guildId, 'stocks'] });
    },
    onError: (error: any) => {
      toast({
        title: "뉴스 분석 실패",
        description: error.message || "뉴스 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Auction creation mutation
  const createAuctionMutation = useMutation({
    mutationFn: async (data: any) => {
      const endTime = new Date(Date.now() + parseInt(data.duration) * 60 * 1000);
      return await apiRequest('POST', `/api/guilds/${user!.guildId}/auctions`, {
        ...data,
        endsAt: endTime.toISOString(),
        startPrice: parseFloat(data.startPrice),
        buyoutPrice: data.buyoutPrice ? parseFloat(data.buyoutPrice) : null,
        minIncrementAbs: data.minIncrement ? parseFloat(data.minIncrement) : null,
        extendSeconds: parseInt(data.extendSeconds),
      });
    },
    onSuccess: () => {
      toast({
        title: "경매 생성 성공",
        description: "새로운 경매가 시작되었습니다.",
      });
      setNewAuction({
        itemRef: '',
        itemType: 'text',
        startPrice: '',
        buyoutPrice: '',
        duration: '60',
        minIncrement: '',
        extendSeconds: '300'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/guilds', user?.guildId, 'auctions'] });
    },
    onError: (error: any) => {
      toast({
        title: "경매 생성 실패",
        description: error.message || "경매 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleCreateStock = () => {
    if (!newStock.symbol || !newStock.name || !newStock.price) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    createStockMutation.mutate({
      symbol: newStock.symbol.toUpperCase(),
      name: newStock.name,
      price: parseFloat(newStock.price),
      totalShares: parseInt(newStock.totalShares),
    }, {
      onError: (error: any) => {
        console.error('Stock creation error:', error);
        toast({
          title: "주식 생성 실패",
          description: error.response?.data?.message || "주식 생성 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      },
      onSuccess: () => {
        toast({
          title: "주식 생성 성공",
          description: `${newStock.symbol} 주식이 성공적으로 생성되었습니다.`,
        });
        setNewStock({ symbol: '', name: '', price: '', totalShares: '1000000' });
      }
    });
  };

  const handleAdjustPrice = () => {
    if (!priceAdjustment.symbol || !priceAdjustment.newPrice) {
      toast({
        title: "입력 오류",
        description: "종목과 새 가격을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    adjustPriceMutation.mutate({
      symbol: priceAdjustment.symbol,
      newPrice: parseFloat(priceAdjustment.newPrice),
    });
  };

  const handleAnalyzeNews = () => {
    if (!newsAnalysis.title || !newsAnalysis.content) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    analyzeNewsMutation.mutate(newsAnalysis);
  };

  const handleCreateAuction = () => {
    if (!newAuction.itemRef || !newAuction.startPrice) {
      toast({
        title: "입력 오류",
        description: "아이템과 시작가를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    createAuctionMutation.mutate(newAuction);
  };

  const applyPriceChangePercent = () => {
    const selectedStock = stocks?.find((s: any) => s.symbol === priceAdjustment.symbol);
    if (selectedStock) {
      const currentPrice = Number(selectedStock.price);
      const changePercent = priceAdjustment.changePercent[0];
      const newPrice = currentPrice * (1 + changePercent / 100);
      setPriceAdjustment(prev => ({ ...prev, newPrice: newPrice.toFixed(2) }));
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="text-center text-gray-400 py-8">
        관리자 권한이 필요합니다.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-controls">
      {/* Stock Management */}
      <Card className="discord-bg-darker border-discord-dark">
        <CardHeader>
          <CardTitle className="text-white">주식 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create New Stock */}
          <div>
            <h4 className="text-lg font-medium text-white mb-4">새 주식 생성</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">종목코드</Label>
                <Input
                  value={newStock.symbol}
                  onChange={(e) => setNewStock(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  placeholder="예: TECH01"
                  className="bg-discord-dark border-discord-dark text-white"
                  data-testid="input-new-stock-symbol"
                />
              </div>
              <div>
                <Label className="text-gray-300">회사명</Label>
                <Input
                  value={newStock.name}
                  onChange={(e) => setNewStock(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 테크기업A"
                  className="bg-discord-dark border-discord-dark text-white"
                  data-testid="input-new-stock-name"
                />
              </div>
              <div>
                <Label className="text-gray-300">초기 가격</Label>
                <Input
                  type="number"
                  value={newStock.price}
                  onChange={(e) => setNewStock(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="100000"
                  className="bg-discord-dark border-discord-dark text-white"
                  data-testid="input-new-stock-price"
                />
              </div>
              <div>
                <Label className="text-gray-300">총 주식 수</Label>
                <Input
                  type="number"
                  value={newStock.totalShares}
                  onChange={(e) => setNewStock(prev => ({ ...prev, totalShares: e.target.value }))}
                  className="bg-discord-dark border-discord-dark text-white"
                  data-testid="input-new-stock-shares"
                />
              </div>
            </div>
            <Button
              onClick={handleCreateStock}
              disabled={createStockMutation.isPending}
              className="mt-4 bg-discord-blue hover:bg-blue-600 text-white"
              data-testid="button-create-stock"
            >
              {createStockMutation.isPending ? '생성 중...' : '주식 생성'}
            </Button>
          </div>

          {/* Price Adjustment */}
          <div>
            <h4 className="text-lg font-medium text-white mb-4">가격 조정</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">종목 선택</Label>
                <Select
                  value={priceAdjustment.symbol}
                  onValueChange={(value) => setPriceAdjustment(prev => ({ ...prev, symbol: value }))}
                >
                  <SelectTrigger className="bg-discord-dark border-discord-dark text-white" data-testid="select-price-adjust-symbol">
                    <SelectValue placeholder="종목 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-discord-dark border-discord-dark">
                    {stocks?.map((stock: any) => (
                      <SelectItem key={stock.symbol} value={stock.symbol} className="text-white hover:bg-discord-darker">
                        {stock.symbol} - {stock.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">새 가격</Label>
                <Input
                  type="number"
                  value={priceAdjustment.newPrice}
                  onChange={(e) => setPriceAdjustment(prev => ({ ...prev, newPrice: e.target.value }))}
                  placeholder="새로운 가격"
                  className="bg-discord-dark border-discord-dark text-white"
                  data-testid="input-price-adjust-value"
                />
              </div>
            </div>
            
            {/* Percentage Change Slider */}
            <div className="mt-4">
              <Label className="text-gray-300">변동률 조절: {priceAdjustment.changePercent[0]}%</Label>
              <div className="flex items-center space-x-4 mt-2">
                <Slider
                  value={priceAdjustment.changePercent}
                  onValueChange={(value) => setPriceAdjustment(prev => ({ ...prev, changePercent: value }))}
                  min={-50}
                  max={50}
                  step={0.1}
                  className="flex-1"
                  data-testid="slider-price-change-percent"
                />
                <Button
                  onClick={applyPriceChangePercent}
                  size="sm"
                  className="bg-discord-gold hover:bg-yellow-500 text-black"
                  data-testid="button-apply-percent-change"
                >
                  적용
                </Button>
              </div>
            </div>

            <Button
              onClick={handleAdjustPrice}
              disabled={adjustPriceMutation.isPending}
              className="mt-4 bg-discord-green hover:bg-green-600 text-white"
              data-testid="button-adjust-price"
            >
              {adjustPriceMutation.isPending ? '조정 중...' : '가격 조정'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* News Analysis */}
      <Card className="discord-bg-darker border-discord-dark">
        <CardHeader>
          <CardTitle className="text-white">뉴스 분석</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">뉴스 제목</Label>
            <Input
              value={newsAnalysis.title}
              onChange={(e) => setNewsAnalysis(prev => ({ ...prev, title: e.target.value }))}
              placeholder="뉴스 제목을 입력하세요"
              className="bg-discord-dark border-discord-dark text-white"
              data-testid="input-news-title"
            />
          </div>
          <div>
            <Label className="text-gray-300">뉴스 내용</Label>
            <Textarea
              value={newsAnalysis.content}
              onChange={(e) => setNewsAnalysis(prev => ({ ...prev, content: e.target.value }))}
              placeholder="뉴스 내용을 입력하세요"
              rows={4}
              className="bg-discord-dark border-discord-dark text-white"
              data-testid="textarea-news-content"
            />
          </div>
          <div>
            <Label className="text-gray-300">대상 종목 (선택사항)</Label>
            <Select
              value={newsAnalysis.symbol}
              onValueChange={(value) => setNewsAnalysis(prev => ({ ...prev, symbol: value }))}
            >
              <SelectTrigger className="bg-discord-dark border-discord-dark text-white" data-testid="select-news-symbol">
                <SelectValue placeholder="전체 종목에 적용 또는 특정 종목 선택" />
              </SelectTrigger>
              <SelectContent className="bg-discord-dark border-discord-dark">
                <SelectItem value="" className="text-white hover:bg-discord-darker">전체 종목</SelectItem>
                {stocks?.map((stock: any) => (
                  <SelectItem key={stock.symbol} value={stock.symbol} className="text-white hover:bg-discord-darker">
                    {stock.symbol} - {stock.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAnalyzeNews}
            disabled={analyzeNewsMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-analyze-news"
          >
            {analyzeNewsMutation.isPending ? '분석 중...' : '뉴스 분석 실행'}
          </Button>
        </CardContent>
      </Card>

      {/* Auction Management */}
      <Card className="discord-bg-darker border-discord-dark">
        <CardHeader>
          <CardTitle className="text-white">경매 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">아이템 유형</Label>
              <Select
                value={newAuction.itemType}
                onValueChange={(value: 'text' | 'stock') => setNewAuction(prev => ({ ...prev, itemType: value }))}
              >
                <SelectTrigger className="bg-discord-dark border-discord-dark text-white" data-testid="select-auction-item-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-discord-dark border-discord-dark">
                  <SelectItem value="text" className="text-white hover:bg-discord-darker">일반 아이템</SelectItem>
                  <SelectItem value="stock" className="text-white hover:bg-discord-darker">주식</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">
                {newAuction.itemType === 'stock' ? '주식 (형식: SYMBOL:수량)' : '아이템 설명'}
              </Label>
              <Input
                value={newAuction.itemRef}
                onChange={(e) => setNewAuction(prev => ({ ...prev, itemRef: e.target.value }))}
                placeholder={newAuction.itemType === 'stock' ? '예: TECH01:100' : '예: 희귀 아이템 #001'}
                className="bg-discord-dark border-discord-dark text-white"
                data-testid="input-auction-item"
              />
            </div>
            <div>
              <Label className="text-gray-300">시작 가격</Label>
              <Input
                type="number"
                value={newAuction.startPrice}
                onChange={(e) => setNewAuction(prev => ({ ...prev, startPrice: e.target.value }))}
                placeholder="1000000"
                className="bg-discord-dark border-discord-dark text-white"
                data-testid="input-auction-start-price"
              />
            </div>
            <div>
              <Label className="text-gray-300">즉시구매가 (선택)</Label>
              <Input
                type="number"
                value={newAuction.buyoutPrice}
                onChange={(e) => setNewAuction(prev => ({ ...prev, buyoutPrice: e.target.value }))}
                placeholder="5000000"
                className="bg-discord-dark border-discord-dark text-white"
                data-testid="input-auction-buyout-price"
              />
            </div>
            <div>
              <Label className="text-gray-300">경매 시간 (분)</Label>
              <Input
                type="number"
                value={newAuction.duration}
                onChange={(e) => setNewAuction(prev => ({ ...prev, duration: e.target.value }))}
                className="bg-discord-dark border-discord-dark text-white"
                data-testid="input-auction-duration"
              />
            </div>
            <div>
              <Label className="text-gray-300">최소 증분</Label>
              <Input
                type="number"
                value={newAuction.minIncrement}
                onChange={(e) => setNewAuction(prev => ({ ...prev, minIncrement: e.target.value }))}
                placeholder="100000"
                className="bg-discord-dark border-discord-dark text-white"
                data-testid="input-auction-min-increment"
              />
            </div>
          </div>
          <Button
            onClick={handleCreateAuction}
            disabled={createAuctionMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-create-auction"
          >
            {createAuctionMutation.isPending ? '생성 중...' : '경매 시작'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
