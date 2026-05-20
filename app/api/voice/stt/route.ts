export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

const NCP_CLIENT_ID = process.env.NCP_CLIENT_ID!;
const NCP_CLIENT_SECRET = process.env.NCP_CLIENT_SECRET!;

export async function POST(req: NextRequest) {
  if (!NCP_CLIENT_ID || !NCP_CLIENT_SECRET) {
    return NextResponse.json({ error: "NCP API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;
  if (!audio) return NextResponse.json({ error: "음성 파일이 없습니다." }, { status: 400 });

  const audioBuffer = await audio.arrayBuffer();

  const res = await fetch("https://clovaspeech-gw.ncloud.com/recog/v1/stt?lang=Kor", {
    method: "POST",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": NCP_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": NCP_CLIENT_SECRET,
      "Content-Type": "application/octet-stream",
    },
    body: audioBuffer,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString());
    return NextResponse.json({ error: `음성 인식 오류: ${err}` }, { status: res.status });
  }

  const data = await res.json();
  const text = (data.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "인식된 텍스트가 없습니다." }, { status: 422 });

  return NextResponse.json({ text });
}
