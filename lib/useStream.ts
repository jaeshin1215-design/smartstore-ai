"use client";
import { useState } from "react";

export function useStream() {
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");

  const readStream = async (
    res: Response,
    onComplete: (fullText: string) => void,
    onError?: () => void
  ) => {
    if (!res.ok || !res.body) { onError?.(); return; }
    setStreaming(true);
    setStreamText("");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamText(fullText);
      }
    } catch { onError?.(); }
    finally {
      setStreaming(false);
      onComplete(fullText);
    }
  };

  return { streaming, streamText, readStream };
}
