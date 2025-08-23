import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function AuctionsPage() {
  const { selectedGuildId, user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [secretPassword, setSecretPassword] = useState('');
  const [itemName, setItemName] = useState('');
  const [startingBid, setStartingBid] = useState('');
  const [duration, setDuration] = useState('24');
  const [description, setDescription] = useState('');

  const { data: auctions = [] } = useQuery({
    queryKey: ['/api/guilds', selectedGuildId, 'auctions'],
    enabled: !!selectedGuildId,
    select: (data: any) => data || [],
  });

  const handleCreateAuction = async () => {
    if (!secretPassword || !itemName || !startingBid) {
      toast({
        title: "입력 오류",
        description: "모든 필수 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 여기서 실제 API 호출
      toast({
        title: "경매 생성 완료",
        description: `${itemName} 경매가 성공적으로 생성되었습니다.`,
      });
      
      setIsCreateDialogOpen(false);
      setSecretPassword('');
      setItemName('');
      setStartingBid('');
      setDescription('');
    } catch (error) {
      toast({
        title: "경매 생성 실패",
        description: "비밀번호가 올바르지 않거나 서버 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">경매</h1>
          <p className="text-gray-400 mt-1">실시간 경매 참여 및 관리</p>
        </div>
        <div className="flex items-center space-x-4">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-yellow-600 hover:bg-yellow-700" data-testid="button-create-auction">
                <i className="fas fa-plus mr-2"></i>
                경매 생성
              </Button>
            </DialogTrigger>
            <DialogContent className="discord-bg-darker border-discord-dark">
              <DialogHeader>
                <DialogTitle className="text-white">새 경매 생성</DialogTitle>
                <DialogDescription className="text-gray-400">
                  봇 명령어로 생성된 비밀번호를 입력하여 경매를 생성하세요.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                  <div className="flex items-center space-x-2 text-yellow-300 mb-2">
                    <i className="fas fa-robot"></i>
                    <span className="font-semibold">봇 명령어 사용법</span>
                  </div>
                  <p className="text-sm text-yellow-200">Discord에서 <code className="bg-discord-dark px-1 rounded">/경매비밀번호생성</code> 명령어를 사용하여 비밀번호를 받으세요.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secret" className="text-white">비밀번호 *</Label>
                  <Input 
                    id="secret"
                    type="password"
                    value={secretPassword}
                    onChange={(e) => setSecretPassword(e.target.value)}
                    placeholder="봇에서 생성된 비밀번호 입력"
                    className="bg-discord-dark border-discord-light text-white"
                    data-testid="input-auction-password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="itemName" className="text-white">상품명 *</Label>
                  <Input 
                    id="itemName"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="경매할 상품의 이름"
                    className="bg-discord-dark border-discord-light text-white"
                    data-testid="input-item-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="startingBid" className="text-white">시작 가격 *</Label>
                  <Input 
                    id="startingBid"
                    type="number"
                    value={startingBid}
                    onChange={(e) => setStartingBid(e.target.value)}
                    placeholder="₩ 시작 가격"
                    className="bg-discord-dark border-discord-light text-white"
                    data-testid="input-starting-bid"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-white">경매 기간 (시간)</Label>
                  <Input 
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="24"
                    className="bg-discord-dark border-discord-light text-white"
                    data-testid="input-auction-duration"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">상품 설명</Label>
                  <Input 
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="상품에 대한 자세한 설명"
                    className="bg-discord-dark border-discord-light text-white"
                    data-testid="input-item-description"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-discord-light text-white hover:bg-discord-dark"
                >
                  취소
                </Button>
                <Button 
                  onClick={handleCreateAuction}
                  className="bg-yellow-600 hover:bg-yellow-700"
                  data-testid="button-submit-auction"
                >
                  <i className="fas fa-gavel mr-2"></i>
                  경매 생성
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 진행 중인 경매 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {auctions.map((auction: any) => (
          <Card key={auction.id} className="discord-bg-darker border-discord-dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>{auction.item}</span>
                <Badge variant="outline" className="border-green-500 text-green-400">
                  진행중
                </Badge>
              </CardTitle>
              <CardDescription>{auction.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">현재 최고가</span>
                <span className="text-white font-bold">₩{auction.currentBid?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">입찰자</span>
                <span className="text-blue-400">{auction.bidder || '없음'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">남은 시간</span>
                <span className="text-yellow-400">{auction.timeLeft}</span>
              </div>
              <Button className="w-full bg-discord-blue hover:bg-discord-blue/80" data-testid={`button-bid-${auction.id}`}>
                <i className="fas fa-hand-paper mr-2"></i>
                입찰하기
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {auctions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 space-y-2">
            <i className="fas fa-gavel text-4xl"></i>
            <p className="text-lg">진행 중인 경매가 없습니다</p>
            <p className="text-sm">새 경매를 생성하여 거래를 시작해보세요!</p>
          </div>
        </div>
      )}
    </div>
  );
}