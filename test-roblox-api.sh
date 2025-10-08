#!/bin/bash

# Roblox Integration Test Script
# 이 스크립트는 Roblox 연동 API의 전체 플로우를 테스트합니다.

# 환경 변수 설정
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
GAME_API_KEY="${ROBLOX_GAME_API_KEY:-your_roblox_game_api_key}"
DISCORD_USER_ID="123456789012345678"
ROBLOX_USER_ID="987654321"
ROBLOX_USERNAME="TestPlayer"
GUILD_ID="1234567890"

echo "======================================"
echo "Roblox Integration API Test"
echo "======================================"
echo "API Base URL: $API_BASE_URL"
echo "Discord User ID: $DISCORD_USER_ID"
echo "Roblox User ID: $ROBLOX_USER_ID"
echo "======================================"
echo ""

# 색상 코드
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 테스트 결과 카운터
PASSED=0
FAILED=0

# 테스트 함수
test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local headers="$5"
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    
    if [ -n "$headers" ]; then
        response=$(curl -s -X "$method" "$API_BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "$headers" \
            -d "$data")
    else
        response=$(curl -s -X "$method" "$API_BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    echo "Response: $response"
    
    if echo "$response" | grep -q "error\|message.*[Ff]ail\|Invalid\|not found" && ! echo "$response" | grep -q "success.*true"; then
        echo -e "${RED}❌ FAILED${NC}\n"
        FAILED=$((FAILED + 1))
        return 1
    else
        echo -e "${GREEN}✅ PASSED${NC}\n"
        PASSED=$((PASSED + 1))
        return 0
    fi
}

echo "======================================"
echo "1. 계정 연동 요청 테스트"
echo "======================================"

response=$(curl -s -X POST "$API_BASE_URL/api/roblox/link/request" \
    -H "Content-Type: application/json" \
    -d "{\"discordUserId\": \"$DISCORD_USER_ID\"}")

echo "Response: $response"

# 인증 코드 추출
VERIFICATION_CODE=$(echo "$response" | grep -o '"verificationCode":"[0-9]*"' | cut -d'"' -f4)

if [ -n "$VERIFICATION_CODE" ]; then
    echo -e "${GREEN}✅ 인증 코드 생성 성공: $VERIFICATION_CODE${NC}\n"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ 인증 코드 생성 실패${NC}\n"
    FAILED=$((FAILED + 1))
    exit 1
fi

echo "======================================"
echo "2. 연동 상태 확인 (연동 전)"
echo "======================================"

test_api "연동 상태 확인" "GET" "/api/roblox/link/status/$DISCORD_USER_ID" "" ""

echo "======================================"
echo "3. 계정 연동 검증"
echo "======================================"

test_api "계정 연동 검증" "POST" "/api/roblox/link/verify" \
    "{\"verificationCode\": \"$VERIFICATION_CODE\", \"robloxUserId\": \"$ROBLOX_USER_ID\", \"robloxUsername\": \"$ROBLOX_USERNAME\"}" \
    "X-Game-Key: $GAME_API_KEY"

echo "======================================"
echo "4. 연동 상태 확인 (연동 후)"
echo "======================================"

test_api "연동 상태 확인 (verified)" "GET" "/api/roblox/link/status/$DISCORD_USER_ID" "" ""

echo "======================================"
echo "5. 잔액 조회"
echo "======================================"

test_api "잔액 조회" "GET" "/api/roblox/economy/balance/$ROBLOX_USER_ID?guildId=$GUILD_ID" "" \
    "X-Game-Key: $GAME_API_KEY"

echo "======================================"
echo "6. 잔액 증가 (입금)"
echo "======================================"

test_api "잔액 증가" "POST" "/api/roblox/economy/adjust" \
    "{\"robloxUserId\": \"$ROBLOX_USER_ID\", \"guildId\": \"$GUILD_ID\", \"amount\": 10000, \"memo\": \"Test deposit\"}" \
    "X-Game-Key: $GAME_API_KEY"

echo "======================================"
echo "7. 잔액 감소 (출금)"
echo "======================================"

test_api "잔액 감소" "POST" "/api/roblox/economy/adjust" \
    "{\"robloxUserId\": \"$ROBLOX_USER_ID\", \"guildId\": \"$GUILD_ID\", \"amount\": -5000, \"memo\": \"Test withdrawal\"}" \
    "X-Game-Key: $GAME_API_KEY"

echo "======================================"
echo "8. 포트폴리오 조회"
echo "======================================"

test_api "포트폴리오 조회" "GET" "/api/roblox/economy/portfolio/$ROBLOX_USER_ID?guildId=$GUILD_ID" "" \
    "X-Game-Key: $GAME_API_KEY"

echo "======================================"
echo "9. 잘못된 API 키 테스트"
echo "======================================"

response=$(curl -s -X GET "$API_BASE_URL/api/roblox/economy/balance/$ROBLOX_USER_ID?guildId=$GUILD_ID" \
    -H "X-Game-Key: invalid_key")

if echo "$response" | grep -q "Invalid game API key"; then
    echo -e "${GREEN}✅ 잘못된 API 키 거부 성공${NC}\n"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ 보안 검증 실패${NC}\n"
    FAILED=$((FAILED + 1))
fi

echo "======================================"
echo "10. 계정 연동 해제"
echo "======================================"

test_api "연동 해제" "DELETE" "/api/roblox/link/$DISCORD_USER_ID" "" ""

echo "======================================"
echo "11. 연동 해제 후 상태 확인"
echo "======================================"

response=$(curl -s -X GET "$API_BASE_URL/api/roblox/link/status/$DISCORD_USER_ID")

if echo "$response" | grep -q '"linked":false'; then
    echo -e "${GREEN}✅ 연동 해제 확인 성공${NC}\n"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ 연동 해제 확인 실패${NC}\n"
    FAILED=$((FAILED + 1))
fi

echo "======================================"
echo "테스트 완료"
echo "======================================"
echo -e "통과: ${GREEN}$PASSED${NC}"
echo -e "실패: ${RED}$FAILED${NC}"
echo "======================================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 모든 테스트 통과!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  일부 테스트 실패${NC}"
    exit 1
fi
