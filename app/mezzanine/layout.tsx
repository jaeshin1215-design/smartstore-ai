import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "메자닌 × 브랜드 입점 인텔리전스 | Aiges Pontos",
  description: "공간 DNA를 역산해 맞는 브랜드를 뽑는 입점 매칭 엔진 — 내부 데모",
};

export default function MezzanineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
