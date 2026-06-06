/**
 * Flow 영상 → 인스타그램 릴스 규격 변환
 *
 * 사용법:
 *   node scratch/pipeline/convert.mjs input.mp4 output_reel.mp4
 *
 * 변환 내용:
 *   - 비율: 16:9 또는 기타 → 9:16 (1080×1920), 중앙 크롭
 *   - 길이: 60초 이하로 자름
 *   - 코덱: H.264 + AAC
 *   - AI 라벨: "AI 생성" 텍스트 우상단 삽입 (AI기본법 제33조)
 *
 * 필수: FFmpeg 설치 (brew install ffmpeg 또는 https://ffmpeg.org)
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

const INPUT  = process.argv[2];
const OUTPUT = process.argv[3] || "reel_output.mp4";

if (!INPUT) {
  console.error("사용법: node convert.mjs <input.mp4> [output.mp4]");
  process.exit(1);
}

if (!existsSync(INPUT)) {
  console.error("파일 없음:", INPUT);
  process.exit(1);
}

// FFmpeg 존재 확인
try {
  execSync("ffmpeg -version", { stdio: "ignore" });
} catch {
  console.error("FFmpeg 미설치. brew install ffmpeg 또는 https://ffmpeg.org");
  process.exit(1);
}

// 9:16 변환 필터:
//   1. 입력 비율 감지 후 중앙 크롭으로 9:16 확보
//   2. 1080×1920 스케일
//   3. "AI 생성" 텍스트 우상단 (흰색, 반투명 검정 박스)
const FONT   = process.platform === "darwin"
  ? "/System/Library/Fonts/Supplemental/AppleGothic.ttf"
  : "C\\:\\\\Windows\\\\Fonts\\\\malgun.ttf";

const VFILTER = [
  "crop=if(gt(iw\\,ih*9/16)\\,ih*9/16\\,iw):if(gt(iw\\,ih*9/16)\\,ih\\,iw*16/9):(iw-if(gt(iw\\,ih*9/16)\\,ih*9/16\\,iw))/2:(ih-if(gt(iw\\,ih*9/16)\\,ih\\,iw*16/9))/2",
  "scale=1080:1920",
  `drawtext=text='AI 생성':fontsize=38:fontcolor=white@0.95:x=w-tw-24:y=24:box=1:boxcolor=black@0.45:boxborderw=10:fontfile='${FONT}'`,
].join(",");

const cmd = [
  "ffmpeg",
  `-i "${INPUT}"`,
  `-vf "${VFILTER}"`,
  `-t 60`,
  `-c:v libx264 -preset medium -crf 23`,
  `-c:a aac -b:a 128k`,
  `-movflags +faststart`,
  `-y`,
  `"${OUTPUT}"`,
].join(" ");

console.log("▶ 변환 시작:", path.resolve(INPUT), "→", path.resolve(OUTPUT));
console.log("  규격: 9:16 · 1080×1920 · 최대 60초 · H.264 · AI 라벨");

try {
  execSync(cmd, { stdio: "inherit" });
  console.log("\n✅ 변환 완료:", path.resolve(OUTPUT));
  console.log("   → 이 파일을 공개 URL(S3·Cloudflare R2 등)에 업로드 후 파이프라인 대시보드에 붙여넣기");
} catch {
  console.error("\n❌ 변환 실패. FFmpeg 로그 확인.");
  process.exit(1);
}
