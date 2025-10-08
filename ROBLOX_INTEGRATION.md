# Roblox Integration Guide

이 문서는 Discord 경제 시뮬레이터 봇을 Roblox 게임과 연동하는 방법을 설명합니다.

## 개요

Roblox 연동을 통해 사용자는 Discord 계정을 Roblox 계정과 연결하여 게임 내에서 봇의 경제 시스템을 사용할 수 있습니다.

## 주요 기능

1. **계정 연동**: Discord 사용자와 Roblox 계정 연결
2. **잔액 조회**: Roblox 게임에서 Discord 계정의 잔액 확인
3. **잔액 조정**: 게임 내 활동에 따른 자동 입출금
4. **포트폴리오 조회**: 보유 주식 및 총 자산 확인
5. **실시간 동기화**: WebSocket을 통한 즉각적인 잔액 업데이트

## 환경 설정

### 1. 환경변수 설정

`server/.env` 파일에 다음 환경변수를 추가하세요:

```env
# Roblox Integration
ROBLOX_GAME_API_KEY=your_secure_game_api_key_here_change_in_production
WEB_CLIENT_API_KEY=your_secure_web_client_key_here_change_in_production
```

⚠️ **중요**: 프로덕션 환경에서는 반드시 강력한 랜덤 키로 변경하세요.

```bash
# 안전한 키 생성 예시 (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. 데이터베이스 마이그레이션

새로운 `roblox_links` 테이블을 생성하기 위해 마이그레이션을 실행하세요:

```bash
npm run db:push
```

이 명령은 다음 테이블을 생성합니다:
- `roblox_links`: Discord-Roblox 계정 연동 정보 저장

## API 엔드포인트

### 1. 계정 연동 요청

**Endpoint**: `POST /api/roblox/link/request`

Discord 사용자가 Roblox 계정과 연동하기 위한 인증 코드를 생성합니다.

**Request Body**:
```json
{
  "discordUserId": "123456789012345678"
}
```

**Response**:
```json
{
  "verificationCode": "12345678",
  "expiresAt": "2025-10-07T10:20:00.000Z",
  "message": "Enter this code in the Roblox game to verify your account"
}
```

**인증 코드 특징**:
- 8자리 숫자 코드
- 10분 후 자동 만료
- 사용자당 하나의 활성 코드만 유지 (새 요청 시 기존 코드 무효화)

### 2. 계정 연동 검증

**Endpoint**: `POST /api/roblox/link/verify`

**Headers**:
```
X-Game-Key: your_roblox_game_api_key
```

Roblox 게임 서버에서 사용자가 입력한 인증 코드를 검증합니다.

**Request Body**:
```json
{
  "verificationCode": "12345678",
  "robloxUserId": "987654321",
  "robloxUsername": "PlayerName"
}
```

**Response**:
```json
{
  "success": true,
  "discordUserId": "123456789012345678",
  "robloxUserId": "987654321",
  "robloxUsername": "PlayerName",
  "verifiedAt": "2025-10-07T10:15:00.000Z"
}
```

**오류 응답**:
- `404`: 유효하지 않거나 만료된 인증 코드
- `400`: 이미 다른 계정에 연동된 Roblox 계정
- `403`: 잘못된 게임 API 키

### 3. 연동 상태 확인

**Endpoint**: `GET /api/roblox/link/status/:discordUserId`

Discord 사용자의 Roblox 연동 상태를 확인합니다.

**Response**:
```json
{
  "linked": true,
  "status": "verified",
  "robloxUserId": "987654321",
  "robloxUsername": "PlayerName",
  "verifiedAt": "2025-10-07T10:15:00.000Z"
}
```

### 4. 계정 연동 해제

**Endpoint**: `DELETE /api/roblox/link/:discordUserId`

Discord 사용자의 Roblox 연동을 해제합니다.

**Response**:
```json
{
  "success": true,
  "message": "Roblox account unlinked"
}
```

### 5. 잔액 조회

**Endpoint**: `GET /api/roblox/economy/balance/:robloxUserId?guildId=GUILD_ID`

**Headers**:
```
X-Game-Key: your_roblox_game_api_key
```

Roblox 사용자의 특정 길드에서의 잔액을 조회합니다.

**Response**:
```json
{
  "robloxUserId": "987654321",
  "discordUserId": "123456789012345678",
  "balance": "1500000.00",
  "frozen": false,
  "tradingSuspended": false
}
```

### 6. 잔액 조정

**Endpoint**: `POST /api/roblox/economy/adjust`

**Headers**:
```
X-Game-Key: your_roblox_game_api_key
```

Roblox 게임 내 활동에 따라 사용자의 잔액을 증가 또는 감소시킵니다.

**Request Body**:
```json
{
  "robloxUserId": "987654321",
  "guildId": "GUILD_ID",
  "amount": 10000,
  "memo": "Quest reward"
}
```

**Parameters**:
- `amount`: 양수(입금) 또는 음수(출금)
- `memo`: 거래 메모 (선택사항)

**Response**:
```json
{
  "success": true,
  "robloxUserId": "987654321",
  "discordUserId": "123456789012345678",
  "newBalance": "1510000.00",
  "adjustment": 10000
}
```

**오류 응답**:
- `400`: 잔액 부족 (출금 시)
- `403`: 계정 동결됨
- `404`: 연동되지 않은 계정

### 7. 포트폴리오 조회

**Endpoint**: `GET /api/roblox/economy/portfolio/:robloxUserId?guildId=GUILD_ID`

**Headers**:
```
X-Game-Key: your_roblox_game_api_key
```

Roblox 사용자의 전체 포트폴리오(잔액 + 보유 주식)를 조회합니다.

**Response**:
```json
{
  "robloxUserId": "987654321",
  "discordUserId": "123456789012345678",
  "balance": "1500000.00",
  "holdings": [
    {
      "symbol": "APPL",
      "name": "Apple Inc.",
      "shares": 100,
      "avgPrice": "15000.00",
      "currentPrice": "16000.00",
      "totalValue": 1600000,
      "profitLoss": 100000
    }
  ],
  "totalValue": 3100000
}
```

## Roblox 게임 구현 예시

### Lua 스크립트 예시 (ServerScriptService)

```lua
local HttpService = game:GetService("HttpService")

-- 환경 설정
local API_BASE_URL = "https://your-server-url.com"
local GAME_API_KEY = "your_roblox_game_api_key"

-- API 호출 헬퍼 함수
local function makeAPIRequest(method, endpoint, body)
    local url = API_BASE_URL .. endpoint
    
    local headers = {
        ["Content-Type"] = "application/json",
        ["X-Game-Key"] = GAME_API_KEY
    }
    
    local success, result = pcall(function()
        return HttpService:RequestAsync({
            Url = url,
            Method = method,
            Headers = headers,
            Body = body and HttpService:JSONEncode(body) or nil
        })
    end)
    
    if success and result.Success then
        return HttpService:JSONDecode(result.Body)
    else
        warn("API request failed:", result)
        return nil
    end
end

-- 계정 연동 검증
function verifyRobloxLink(verificationCode, robloxUserId, robloxUsername)
    return makeAPIRequest("POST", "/api/roblox/link/verify", {
        verificationCode = verificationCode,
        robloxUserId = tostring(robloxUserId),
        robloxUsername = robloxUsername
    })
end

-- 잔액 조회
function getBalance(robloxUserId, guildId)
    local endpoint = string.format("/api/roblox/economy/balance/%s?guildId=%s", 
        tostring(robloxUserId), guildId)
    return makeAPIRequest("GET", endpoint)
end

-- 잔액 조정
function adjustBalance(robloxUserId, guildId, amount, memo)
    return makeAPIRequest("POST", "/api/roblox/economy/adjust", {
        robloxUserId = tostring(robloxUserId),
        guildId = guildId,
        amount = amount,
        memo = memo
    })
end

-- 포트폴리오 조회
function getPortfolio(robloxUserId, guildId)
    local endpoint = string.format("/api/roblox/economy/portfolio/%s?guildId=%s", 
        tostring(robloxUserId), guildId)
    return makeAPIRequest("GET", endpoint)
end

-- 플레이어 입장 시 자동 잔액 로드
game.Players.PlayerAdded:Connect(function(player)
    local guildId = "YOUR_GUILD_ID" -- 설정 필요
    
    -- 잔액 조회
    local balanceData = getBalance(player.UserId, guildId)
    
    if balanceData then
        print(string.format("%s의 잔액: %s원", player.Name, balanceData.balance))
        
        -- 플레이어 leaderstats 업데이트
        local leaderstats = Instance.new("Folder")
        leaderstats.Name = "leaderstats"
        leaderstats.Parent = player
        
        local balance = Instance.new("IntValue")
        balance.Name = "Balance"
        balance.Value = tonumber(balanceData.balance)
        balance.Parent = leaderstats
    else
        warn(player.Name .. "의 계정이 연동되지 않았습니다.")
    end
end)

-- 보상 지급 예시
function rewardPlayer(player, amount, reason)
    local guildId = "YOUR_GUILD_ID"
    
    local result = adjustBalance(player.UserId, guildId, amount, reason)
    
    if result and result.success then
        print(string.format("%s에게 %d원 지급 완료 (%s)", 
            player.Name, amount, reason))
        
        -- UI 업데이트
        if player.leaderstats and player.leaderstats.Balance then
            player.leaderstats.Balance.Value = tonumber(result.newBalance)
        end
        
        return true
    else
        warn("보상 지급 실패:", player.Name)
        return false
    end
end
```

### 계정 연동 GUI 예시

```lua
-- LocalScript in StarterGui
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local screenGui = script.Parent

-- GUI 요소 생성
local linkFrame = Instance.new("Frame")
linkFrame.Size = UDim2.new(0, 400, 0, 250)
linkFrame.Position = UDim2.new(0.5, -200, 0.5, -125)
linkFrame.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
linkFrame.Parent = screenGui

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1, 0, 0, 50)
titleLabel.Text = "Discord 계정 연동"
titleLabel.TextSize = 24
titleLabel.Parent = linkFrame

local codeInput = Instance.new("TextBox")
codeInput.Size = UDim2.new(0.8, 0, 0, 50)
codeInput.Position = UDim2.new(0.1, 0, 0, 80)
codeInput.PlaceholderText = "8자리 인증 코드 입력"
codeInput.TextSize = 20
codeInput.Parent = linkFrame

local verifyButton = Instance.new("TextButton")
verifyButton.Size = UDim2.new(0.8, 0, 0, 50)
verifyButton.Position = UDim2.new(0.1, 0, 0, 150)
verifyButton.Text = "연동하기"
verifyButton.TextSize = 20
verifyButton.Parent = linkFrame

-- 서버에 연동 요청
local verifyRemote = ReplicatedStorage:WaitForChild("VerifyLink")

verifyButton.MouseButton1Click:Connect(function()
    local code = codeInput.Text
    
    if #code == 8 then
        verifyRemote:FireServer(code)
        verifyButton.Text = "연동 중..."
    else
        verifyButton.Text = "8자리 코드를 입력하세요"
        wait(2)
        verifyButton.Text = "연동하기"
    end
end)
```

## 보안 고려사항

1. **API 키 보호**
   - `ROBLOX_GAME_API_KEY`는 절대 클라이언트(Lua 스크립트)에 노출하지 마세요
   - 서버 측 스크립트(ServerScriptService)에서만 사용
   - 환경변수나 보안 스토리지에 저장

2. **Rate Limiting**
   - 게임 서버에서 API 호출 빈도를 제한하세요
   - 캐싱을 활용하여 불필요한 조회 방지

3. **입력 검증**
   - 모든 사용자 입력(금액, 메모 등)을 검증
   - SQL Injection, XSS 등 보안 위협 방지

4. **모니터링**
   - 비정상적인 API 호출 패턴 감지
   - 로그를 통한 감사 추적

## WebSocket 이벤트

실시간 업데이트를 위한 WebSocket 이벤트:

### `balance_updated`
```json
{
  "guildId": "GUILD_ID",
  "userId": "USER_ID",
  "balance": "1510000.00",
  "change": 10000
}
```

사용자의 잔액이 변경될 때 발생합니다.

### `trade_executed`
```json
{
  "guildId": "GUILD_ID",
  "userId": "USER_ID",
  "symbol": "APPL",
  "type": "buy",
  "shares": 10,
  "price": "16000.00"
}
```

사용자가 주식 거래를 실행할 때 발생합니다.

## 테스트

### 로컬 테스트

```bash
# 1. 서버 시작
npm run dev

# 2. 계정 연동 요청
curl -X POST http://localhost:3000/api/roblox/link/request \
  -H "Content-Type: application/json" \
  -d '{"discordUserId": "123456789012345678"}'

# 3. 연동 검증 (게임 서버에서)
curl -X POST http://localhost:3000/api/roblox/link/verify \
  -H "Content-Type: application/json" \
  -H "X-Game-Key: your_roblox_game_api_key" \
  -d '{
    "verificationCode": "12345678",
    "robloxUserId": "987654321",
    "robloxUsername": "TestPlayer"
  }'

# 4. 잔액 조회
curl -X GET "http://localhost:3000/api/roblox/economy/balance/987654321?guildId=YOUR_GUILD_ID" \
  -H "X-Game-Key: your_roblox_game_api_key"

# 5. 잔액 조정
curl -X POST http://localhost:3000/api/roblox/economy/adjust \
  -H "Content-Type: application/json" \
  -H "X-Game-Key: your_roblox_game_api_key" \
  -d '{
    "robloxUserId": "987654321",
    "guildId": "YOUR_GUILD_ID",
    "amount": 10000,
    "memo": "Test reward"
  }'
```

## 문제 해결

### 1. "Server configuration error: ROBLOX_GAME_API_KEY not properly configured"

**원인**: 환경변수가 설정되지 않았거나 기본값 그대로 사용 중

**해결**:
```bash
# .env 파일에서 ROBLOX_GAME_API_KEY를 강력한 랜덤 키로 변경
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. "Invalid game API key"

**원인**: Roblox 게임에서 잘못된 API 키 사용

**해결**: Lua 스크립트의 `GAME_API_KEY` 값이 서버의 `ROBLOX_GAME_API_KEY`와 일치하는지 확인

### 3. "Roblox account not linked"

**원인**: 사용자가 계정 연동을 완료하지 않음

**해결**: 
1. Discord에서 `/link` 명령어 실행 (봇 구현 필요)
2. 받은 8자리 코드를 Roblox 게임에서 입력
3. 연동 완료 후 재시도

### 4. "Verification code has expired"

**원인**: 인증 코드가 10분 경과하여 만료됨

**해결**: 새로운 인증 코드 요청

## 확장 가능성

추후 추가 가능한 기능:

1. **거래 실행**: Roblox 게임에서 직접 주식 매매
2. **알림 시스템**: 가격 변동, 체결 알림을 게임 내 표시
3. **리더보드**: 길드 내 자산 순위
4. **미션 시스템**: 특정 거래 목표 달성 시 보상
5. **배당금**: 주식 보유에 따른 자동 수익

## 지원

문제가 발생하거나 질문이 있으시면:
- GitHub Issues: [프로젝트 저장소]
- Discord 서버: [지원 서버 링크]

---

**마지막 업데이트**: 2025-10-07
