import { useAuth } from "@/hooks/use-auth";

export default function DashboardMinimal() {
  const { selectedGuildId } = useAuth();

  return (
    <div className="min-h-screen bg-red-500 p-8">
      <div className="text-white text-4xl font-bold">
        최소 대시보드 테스트
      </div>
      <div className="text-white text-xl mt-4">
        Guild ID: {selectedGuildId || "없음"}
      </div>
      <div className="bg-blue-500 text-white p-4 mt-4 rounded">
        이 화면이 보이면 기본 렌더링은 작동하는 것입니다.
      </div>
    </div>
  );
}