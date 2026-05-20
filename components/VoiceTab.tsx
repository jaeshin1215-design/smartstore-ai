"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

type Stage = "idle" | "recording" | "transcribing" | "thinking" | "speaking";

const STAGE_LABEL: Record<Stage, string> = {
  idle: "버튼을 누르고 말하기",
  recording: "듣고 있어요... (떼면 전송)",
  transcribing: "음성 인식 중...",
  thinking: "AI 생각 중...",
  speaking: "답변 읽는 중...",
};

export default function VoiceTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioUrlRef = useRef<string>("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100);
      setStage("recording");
    } catch {
      setError("마이크 접근 권한을 허용해 주세요.");
    }
  }, []);

  const stopAndProcess = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setStage("transcribing");

    // Wait for recorder to stop
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const mimeType = recorder.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });

    if (blob.size < 800) {
      setError("너무 짧습니다. 더 길게 말씀해 주세요.");
      setStage("idle");
      return;
    }

    // ── Step 1: STT ──
    const ext = mimeType.includes("mp4") ? "m4a" : "webm";
    const formData = new FormData();
    formData.append("audio", blob, `rec.${ext}`);

    let userText = "";
    try {
      const res = await fetch("/api/voice/stt", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.text) throw new Error(data.error ?? "음성 인식 실패");
      userText = data.text;
    } catch (e) {
      setError(e instanceof Error ? e.message : "음성 인식에 실패했습니다.");
      setStage("idle");
      return;
    }

    const nextMessages: Message[] = [...messages, { role: "user", text: userText }];
    setMessages(nextMessages);
    setStage("thinking");

    // ── Step 2: Claude Chat ──
    let aiText = "";
    try {
      const res = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok || !data.text) throw new Error(data.error ?? "AI 응답 실패");
      aiText = data.text;
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 응답에 실패했습니다.");
      setStage("idle");
      return;
    }

    setMessages((prev) => [...prev, { role: "assistant", text: aiText }]);
    setStage("speaking");

    // ── Step 3: TTS ──
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      if (!res.ok) throw new Error("TTS 실패");

      const audioBlob = await res.blob();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;

      const audio = audioRef.current;
      if (audio) {
        audio.src = url;
        audio.onended = () => setStage("idle");
        await audio.play().catch(() => setStage("idle"));
      }
    } catch {
      // TTS 실패해도 텍스트는 표시
      setStage("idle");
    }
  }, [messages]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (stage === "idle") startRecording();
    },
    [stage, startRecording]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (stage === "recording") stopAndProcess();
    },
    [stage, stopAndProcess]
  );

  const isActive = stage !== "idle";
  const isRecording = stage === "recording";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 200px)", maxHeight: 640 }}>
      {/* ── 대화 목록 ── */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-5xl mb-4">🎙️</div>
            <p className="font-bold text-base" style={{ color: "#0f2a1e" }}>
              AI 음성 상담
            </p>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9ca3af" }}>
              스마트스토어 관련 무엇이든 물어보세요
              <br />
              상품명, SEO, 가격 전략, 트렌드 분석
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={
                msg.role === "user"
                  ? { background: "#00aa6c", color: "white" }
                  : {
                      background: "white",
                      color: "#0f2a1e",
                      border: "1px solid #e0ede9",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }
              }
            >
              {msg.role === "assistant" && (
                <span
                  className="text-[10px] font-bold block mb-1"
                  style={{ color: "#00aa6c" }}
                >
                  AI 파트너 🤖
                </span>
              )}
              {msg.text}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ── 에러 ── */}
      {error && (
        <div
          className="text-xs text-center py-2 px-3 rounded-lg mb-2"
          style={{ background: "#fff0f0", color: "#e53e3e" }}
        >
          {error}
        </div>
      )}

      {/* ── 상태 표시 ── */}
      <div className="flex flex-col items-center gap-4 pt-2 pb-1">
        <p className="text-xs font-medium" style={{ color: "#6b7280" }}>
          {STAGE_LABEL[stage]}
        </p>

        {/* 마이크 버튼 */}
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          disabled={isActive && !isRecording}
          className="relative flex items-center justify-center w-20 h-20 rounded-full text-3xl select-none touch-none transition-all"
          style={{
            background: isRecording
              ? "#e53e3e"
              : isActive
              ? "#9ca3af"
              : "#00aa6c",
            color: "white",
            boxShadow: isRecording
              ? "0 0 0 0 rgba(229,62,62,0.4)"
              : isActive
              ? "none"
              : "0 4px 20px rgba(0,170,108,0.4)",
            transform: isRecording ? "scale(1.1)" : "scale(1)",
            animation: isRecording ? "pulse-ring 1s ease-out infinite" : "none",
            cursor: isActive && !isRecording ? "not-allowed" : "pointer",
          }}
        >
          {stage === "recording"
            ? "⏹"
            : stage === "speaking"
            ? "🔊"
            : stage === "thinking" || stage === "transcribing"
            ? "⏳"
            : "🎙️"}
        </button>

        {/* 대화 초기화 */}
        {messages.length > 0 && !isActive && (
          <button
            onClick={() => {
              setMessages([]);
              setError("");
            }}
            className="text-xs px-4 py-1.5 rounded-full transition-opacity hover:opacity-70"
            style={{ color: "#9ca3af", background: "#f3f4f6" }}
          >
            대화 초기화
          </button>
        )}
      </div>

      <audio ref={audioRef} className="hidden" />

      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(229,62,62,0.5); }
          70% { box-shadow: 0 0 0 16px rgba(229,62,62,0); }
          100% { box-shadow: 0 0 0 0 rgba(229,62,62,0); }
        }
      `}</style>
    </div>
  );
}
