"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export default function ImageEditTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  const [text, setText] = useState("");
  const [textSize, setTextSize] = useState(36);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textBg, setTextBg] = useState(true);
  const [textPosition, setTextPosition] = useState("bottom");
  const [subText, setSubText] = useState("");
  const [outputSize, setOutputSize] = useState("1000");
  const [downloading, setDownloading] = useState(false);

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const size = parseInt(outputSize);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    const scale = Math.min(size / image.width, size / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(image, x, y, w, h);
    ctx.filter = "none";

    if (sharpness > 0) {
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      const factor = sharpness * 0.3;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * (1 + factor));
        data[i + 1] = Math.min(255, data[i + 1] * (1 + factor));
        data[i + 2] = Math.min(255, data[i + 2] * (1 + factor));
      }
      ctx.putImageData(imageData, 0, 0);
    }

    if (text) {
      const fontSize = Math.round(size * textSize / 500);
      ctx.font = `bold ${fontSize}px Pretendard, sans-serif`;
      const textWidth = ctx.measureText(text).width;
      const padding = fontSize * 0.5;
      let ty = textPosition === "top" ? fontSize + padding * 2
        : textPosition === "middle" ? size / 2
        : size - padding * 2;
      const tx = size / 2;

      if (textBg) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        const bgH = fontSize + padding * 2 + (subText ? fontSize * 0.7 + padding : 0);
        const bgY = textPosition === "top" ? 0
          : textPosition === "middle" ? ty - fontSize - padding
          : size - bgH;
        ctx.fillRect(0, bgY, size, bgH);
      }

      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, tx, ty);

      if (subText) {
        const subFontSize = Math.round(fontSize * 0.6);
        ctx.font = `${subFontSize}px Pretendard, sans-serif`;
        ctx.fillStyle = textColor + "cc";
        ctx.fillText(subText, tx, ty + fontSize * 0.8);
      }

      const maxW = size * 0.9;
      if (textWidth > maxW) {
        ctx.font = `bold ${Math.round(fontSize * maxW / textWidth)}px Pretendard, sans-serif`;
        ctx.fillText(text, tx, ty);
      }
    }
  }, [image, brightness, contrast, saturation, sharpness, text, textSize, textColor, textBg, textPosition, subText, outputSize]);

  useEffect(() => {
    drawImage();
  }, [drawImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    const link = document.createElement("a");
    link.download = `thumbnail_${Date.now()}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
    setTimeout(() => setDownloading(false), 1000);
  };

  const handleReset = () => {
    setBrightness(100); setContrast(100); setSaturation(100); setSharpness(0);
    setText(""); setSubText(""); setTextSize(36); setTextColor("#ffffff"); setTextBg(true); setTextPosition("bottom");
  };

  const SliderRow = ({ label, value, setValue, min, max, unit = "%" }: {
    label: string; value: number; setValue: (v: number) => void; min: number; max: number; unit?: string;
  }) => (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className="text-xs text-indigo-600 font-bold">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-indigo-500" />
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>🖼️ 이미지 편집기</h2>
      <p className="text-gray-400 text-sm mb-6">기존 상품 이미지를 보정하고 썸네일 문구를 추가해서 바로 사용하세요</p>

      {/* 이미지 업로드 */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "#1a1a2e" }}>
            상품 이미지 업로드 <span className="text-red-400">*</span>
          </label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors">
            <span className="text-2xl mb-1">📁</span>
            <span className="text-sm text-indigo-500 font-semibold">{fileName || "클릭하여 이미지 선택"}</span>
            <span className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP 지원</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {image && (
          <>
            {/* 미리보기 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>미리보기</p>
                <select value={outputSize} onChange={(e) => setOutputSize(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none">
                  <option value="500">500×500 (미리보기)</option>
                  <option value="1000">1000×1000 (표준)</option>
                  <option value="1200">1200×1200 (고화질)</option>
                </select>
              </div>
              <canvas ref={canvasRef}
                className="w-full rounded-xl border border-gray-200"
                style={{ maxHeight: "320px", objectFit: "contain" }} />
            </div>

            {/* 보정 슬라이더 */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>🎨 이미지 보정</p>
              <SliderRow label="밝기" value={brightness} setValue={setBrightness} min={50} max={150} />
              <SliderRow label="대비" value={contrast} setValue={setContrast} min={50} max={150} />
              <SliderRow label="채도" value={saturation} setValue={setSaturation} min={0} max={200} />
              <SliderRow label="선명도" value={sharpness} setValue={setSharpness} min={0} max={10} unit="" />
              <button onClick={handleReset}
                className="text-xs text-gray-400 underline cursor-pointer">초기화</button>
            </div>

            {/* 텍스트 오버레이 */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>✍️ 썸네일 문구 추가</p>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">메인 문구</label>
                <input type="text" value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="예) 오늘만 특가! 무료배송"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">서브 문구 (선택)</label>
                <input type="text" value={subText} onChange={(e) => setSubText(e.target.value)}
                  placeholder="예) 국산 유기농 인증"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">텍스트 크기</label>
                  <input type="range" min={16} max={72} value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    className="w-full accent-indigo-500" />
                  <p className="text-xs text-center text-indigo-500">{textSize}px</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">텍스트 색상</label>
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">위치</label>
                  <select value={textPosition} onChange={(e) => setTextPosition(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm outline-none bg-white">
                    <option value="top">상단</option>
                    <option value="middle">중앙</option>
                    <option value="bottom">하단</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={textBg} onChange={(e) => setTextBg(e.target.checked)}
                  className="accent-indigo-500" />
                <span className="text-xs text-gray-600">텍스트 배경 (가독성 향상)</span>
              </label>
            </div>

            {/* 다운로드 버튼 */}
            <button onClick={handleDownload} disabled={downloading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm cursor-pointer disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              {downloading ? "⏳ 저장 중..." : "⬇️ 이미지 다운로드"}
            </button>

            <p className="text-xs text-center text-gray-400">
              JPG 형식으로 저장 · 스마트스토어 썸네일 권장 사이즈 1000×1000px
            </p>
          </>
        )}
      </div>
    </div>
  );
}
