export const CATEGORIES = [
  { id: "all",         label: "전체"            },
  { id: "performance", label: "★ 공연·굿즈"     },
  { id: "bakery_fb",   label: "★ F&B·베이커리"  },
  { id: "wellness",    label: "★ 웰니스"         },
  { id: "outdoor",     label: "⚡ 캠핑·아웃도어" },
  { id: "fashion",     label: "☆ 패션"           },
  { id: "ip_content",  label: "☆ IP·콘텐츠"      },
  { id: "beauty",      label: "☆ 뷰티"           },
] as const;

export type CategoryId = typeof CATEGORIES[number]["id"];
