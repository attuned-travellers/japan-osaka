/*
 * 오사카 여행 설정 — 카테고리·지역·색·안내문
 * 옵션·아이템 스키마 전체 설명은 assets/trip-cards.js 상단 주석 참고.
 * ▸ 카테고리 추가: categories 에 한 줄 (group 으로 여행지/음식 탭 지정)
 * ▸ 지역 추가:     areas 에 한 줄
 * ▸ 데이터 추가:   places/data/*.js 의 Trip.add([...]) 에 항목 추가
 */
Trip.config({
  id: "osaka",                        // 기존 찜/다녀옴 기록(osaka:fav, osaka:visited) 그대로 사용
  title: "오사카 여행 카드",
  eyebrow: "🍁 OCTOBER 2026 · 大阪",
  intro: "가볼 만한 곳, 먹어볼 것, 쇼핑과 근교까지. 카드를 누르면 상세 정보가 열리고, 찜·다녀옴 표시는 이 브라우저에 저장됩니다.",
  mapSuffix: "大阪",
  accent: "#d9480f",

  groups: {
    spot: { label: "여행지", emoji: "📍" },
    food: { label: "음식", emoji: "🍽" },
  },

  categories: {
    spot:     { group: "spot", label: "관광지",      emoji: "📍", color: "#e4572e" },
    night:    { group: "spot", label: "야경·밤",     emoji: "🌃", color: "#7048e8" },
    shopping: { group: "spot", label: "쇼핑",        emoji: "🛍️", color: "#4c6ef5" },
    daytrip:  { group: "spot", label: "근교",        emoji: "🚆", color: "#2b9348" },
    food:     { group: "food", label: "음식",        emoji: "🍜", color: "#f3a712" },
    cafe:     { group: "food", label: "카페·디저트", emoji: "🍰", color: "#c1666b" },
    drink:    { group: "food", label: "위스키·술",   emoji: "🥃", color: "#a0522d" },
  },

  areas: {
    "kita":         { label: "키타 (우메다)" },
    "minami":       { label: "미나미 (난바·도톤보리)" },
    "shinsaibashi": { label: "신사이바시·아메무라" },
    "osaka-castle": { label: "오사카성 주변" },
    "tennoji":      { label: "텐노지·신세카이" },
    "bay":          { label: "베이 에리어" },
    "nakanoshima":  { label: "나카노시마·키타하마" },
    "north-osaka":  { label: "북오사카 (미노오·반파쿠)" },
    "south-osaka":  { label: "남오사카 (스미요시)" },
    "tsuruhashi":   { label: "츠루하시" },
    "kyoto":        { label: "교토" },
    "nara":         { label: "나라" },
    "kobe":         { label: "고베" },
    "yamazaki":     { label: "야마자키 (시마모토)" },
    "other":        { label: "기타" },
  },

  seasonal: { field: "october", label: "10월 포인트", emoji: "🍁" },
});
