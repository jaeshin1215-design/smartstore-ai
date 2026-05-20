export const maxDuration = 15;

import { NextRequest } from "next/server";

const NCP_CLIENT_ID = process.env.NCP_CLIENT_ID!;
const NCP_CLIENT_SECRET = process.env.NCP_CLIENT_SECRET!;

export async function POST(req: NextRequest) {
  if (!NCP_CLIENT_ID || !NCP_CLIENT_SECRET) {
    return new Response("NCP API 키가 설정되지 않았습니다.", { status: 500 });
  }

  const { text } = await req.json();
  if (!text) return new Response("텍스트가 없습니다.", { status: 400 });

  const params = new URLSearchParams({
    speaker: "nara",
    volume: "0",
    speed: "0",
    pitch: "0",
    format: "mp3",
    text: String(text).slice(0, 2000),
  });

  const res = await fetch("https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts", {
    method: "POST",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": NCP_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": NCP_CLIENT_SECRET,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString());
    return new Response(`TTS 오류: ${err}`, { status: res.status });
  }

  const audioBuffer = await res.arrayBuffer();
  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.byteLength.toString(),
    },
  });
}
