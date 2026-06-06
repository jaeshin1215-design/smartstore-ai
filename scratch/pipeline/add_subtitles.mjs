/**
 * A/B 자막 + AI 생성 라벨 삽입
 *
 * 사용법:
 *   node scratch/pipeline/add_subtitles.mjs a     ← A안: 수경식물 (신뢰형)
 *   node scratch/pipeline/add_subtitles.mjs b     ← B안: 화분 (감성형)
 *   node scratch/pipeline/add_subtitles.mjs all   ← 두 영상 모두
 *
 * 입력: 바탕화면\릴스_1차_PoC\*.mp4
 * 출력: 같은 폴더, 파일명 _final.mp4 접미사
 *
 * 필수: FFmpeg 설치 (https://ffmpeg.org)
 *
 * 이모지 참고: FFmpeg drawtext는 컬러 이모지 렌더링이 불안정함.
 *   🌱 🪴 이모지는 텍스트에서 제거됨. 업로드 캡션(텍스트)에 별도 포함할 것.
 */

import { execSync }                    from "child_process";
import { writeFileSync, unlinkSync,
         existsSync }                  from "fs";
import os                              from "os";
import path                            from "path";

// ─── 경로 설정 ────────────────────────────────────────────────────────────────

const INPUT_DIR = path.join(os.homedir(), "Desktop", "릴스_1차_PoC");

const FONT = os.platform() === "win32"
  ? "C\\:/Windows/Fonts/malgun.ttf"   // 맑은 고딕 (한국어)
  : "/System/Library/Fonts/Supplemental/AppleGothic.ttf";

// ─── 카피 (표시광고법 준수 — 검증 가능한 사실만) ─────────────────────────────

const CAPTIONS = {
  a: [  // 수경식물 — 신뢰형
    { line1: "책상에 식물 두고 싶은데",     line2: "벌레 때문에 포기했죠?" },
    { line1: "흙이 없어서",                 line2: "벌레가 안 생겨요" },
    { line1: "물은 2주에 한 번",            line2: "뿌리까지 보이는 건강한 식물" },
    { line1: "댓글 초록 남기면",            line2: "키우는 법 보내드려요" },
  ],
  b: [  // 화분 — 감성형
    { line1: "책상이 좀 허전하지 않아요?",  line2: "" },
    { line1: "표정 있는 작은 화분",         line2: "보기만 해도 기분 좋아져요" },
    { line1: "손바닥만 한 다육이",          line2: "손 많이 안 가요" },
    { line1: "댓글 화분 남기면",            line2: "키우는 법 보내드려요" },
  ],
};

const VIDEOS = {
  a: { in: "수경식물_릴스_1080_v2.mp4",  out: "수경식물_릴스_1080_v2_final.mp4" },
  b: { in: "화분_릴스_1080_v2.mp4",      out: "화분_릴스_1080_v2_final.mp4" },
};

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function getDuration(filePath) {
  return parseFloat(
    execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    ).toString().trim()
  );
}

// Windows 드라이브 레터 콜론 이스케이프 (FFmpeg 요구사항)
function toFFmpegPath(p) {
  if (os.platform() === "win32") {
    return p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1\\:");
  }
  return p;
}

// 영상 길이 기반으로 4구간 타임코드 계산
function getSegments(duration) {
  return [
    { t0: 0,                  t1: duration * 0.28  },  // 후킹
    { t0: duration * 0.28,    t1: duration * 0.55  },  // 중간 1
    { t0: duration * 0.55,    t1: duration * 0.75  },  // 중간 2
    { t0: duration * 0.75,    t1: duration         },  // CTA
  ];
}

// ─── 필터 빌드 ────────────────────────────────────────────────────────────────

function buildVFilter(captions, segments, tmpFiles) {
  const filters = [];

  // AI 생성 라벨 (법적 의무 — 항상 표시)
  filters.push(
    `drawtext=fontfile='${FONT}':text='AI 생성'` +
    `:fontsize=34:fontcolor=white@0.92` +
    `:x=w-tw-22:y=22` +
    `:box=1:boxcolor=black@0.45:boxborderw=10`
  );

  // 구간별 자막
  segments.forEach((seg, i) => {
    const cap = captions[i];
    if (!cap) return;

    const t0 = seg.t0.toFixed(2);
    const t1 = seg.t1.toFixed(2);
    const enable = `between(t,${t0},${t1})`;

    const Y_LINE1 = 1380;
    const Y_LINE2 = 1465;

    if (cap.line1) {
      // textfile 방식: UTF-8 한국어 직접 파일로 — 셸 이스케이프 문제 없음
      const tf = path.join(os.tmpdir(), `sf_${i}_0_${Date.now()}.txt`);
      writeFileSync(tf, cap.line1, "utf-8");
      tmpFiles.push(tf);
      filters.push(
        `drawtext=enable='${enable}'` +
        `:fontfile='${FONT}'` +
        `:textfile='${toFFmpegPath(tf)}'` +
        `:fontsize=56:fontcolor=white` +
        `:x=(w-text_w)/2:y=${Y_LINE1}` +
        `:box=1:boxcolor=black@0.55:boxborderw=14`
      );
    }

    if (cap.line2) {
      const tf = path.join(os.tmpdir(), `sf_${i}_1_${Date.now()}.txt`);
      writeFileSync(tf, cap.line2, "utf-8");
      tmpFiles.push(tf);
      filters.push(
        `drawtext=enable='${enable}'` +
        `:fontfile='${FONT}'` +
        `:textfile='${toFFmpegPath(tf)}'` +
        `:fontsize=48:fontcolor=white@0.92` +
        `:x=(w-text_w)/2:y=${Y_LINE2}` +
        `:box=1:boxcolor=black@0.50:boxborderw=12`
      );
    }
  });

  return filters.join(",");
}

// ─── 영상 처리 ────────────────────────────────────────────────────────────────

function processVideo(variant) {
  const v = VIDEOS[variant];
  const inputPath  = path.join(INPUT_DIR, v.in);
  const outputPath = path.join(INPUT_DIR, v.out);

  if (!existsSync(inputPath)) {
    console.error(`\n❌ 파일 없음: ${inputPath}`);
    process.exit(1);
  }

  const label = variant === "a" ? "A안 (수경식물 — 신뢰형)" : "B안 (화분 — 감성형)";
  console.log(`\n▶ ${label}`);
  console.log(`   입력: ${inputPath}`);

  // FFmpeg 존재 확인
  try { execSync("ffmpeg -version", { stdio: "ignore" }); }
  catch { console.error("❌ FFmpeg 미설치"); process.exit(1); }

  const duration = getDuration(inputPath);
  console.log(`   원본 길이: ${duration.toFixed(2)}초`);

  const segments = getSegments(duration);
  console.log(`   구간: 후킹 0-${(duration*0.28).toFixed(1)}s | 중간1 ${(duration*0.28).toFixed(1)}-${(duration*0.55).toFixed(1)}s | 중간2 ${(duration*0.55).toFixed(1)}-${(duration*0.75).toFixed(1)}s | CTA ${(duration*0.75).toFixed(1)}s~끝`);

  const tmpFiles = [];
  try {
    const vfilter = buildVFilter(CAPTIONS[variant], segments, tmpFiles);

    const cmd = [
      "ffmpeg",
      `-i "${inputPath}"`,
      `-vf "${vfilter}"`,
      `-c:v libx264 -preset medium -crf 22`,
      `-c:a copy`,
      `-movflags +faststart`,
      `-y`,
      `"${outputPath}"`,
    ].join(" ");

    console.log("\n   FFmpeg 실행 중...");
    execSync(cmd, { stdio: "inherit" });

    // 출력 해상도 검증 로그 (§3-3 요구사항)
    const info = execSync(
      `ffprobe -v error -select_streams v:0 ` +
      `-show_entries stream=width,height,r_frame_rate,codec_name ` +
      `-of default=noprint_wrappers=1 "${outputPath}"`
    ).toString().trim();

    console.log(`\n✅ 완료: ${outputPath}`);
    console.log(`   출력 규격:\n${info.split("\n").map(l => "   " + l).join("\n")}`);
    console.log(`\n   인스타 캡션 (이모지 포함 버전):`);
    if (variant === "a") {
      console.log(`   댓글 '초록' 남기면 키우는 법 보내드려요 🌱`);
      console.log(`   #수경식물 #흙없는식물 #책상식물 #수경재배 #test_수경`);
    } else {
      console.log(`   댓글 '화분' 남기면 키우는 법 보내드려요 🪴`);
      console.log(`   #화분 #다육이 #책상인테리어 #식물인테리어 #test_화분`);
    }

  } finally {
    tmpFiles.forEach(f => { try { unlinkSync(f); } catch {} });
  }
}

// ─── 실행 ─────────────────────────────────────────────────────────────────────

const arg = process.argv[2];
if (arg === "all") {
  processVideo("a");
  processVideo("b");
} else if (arg === "a" || arg === "b") {
  processVideo(arg);
} else {
  console.log("사용법: node scratch/pipeline/add_subtitles.mjs [a|b|all]");
  console.log("  a   — 수경식물 A안 (신뢰형)");
  console.log("  b   — 화분 B안 (감성형)");
  console.log("  all — 두 영상 모두");
  process.exit(1);
}
