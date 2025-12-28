"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  audioUrl?: string;
  className?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  startTime?: number;
  endTime?: number;
  onRangeChange?: (start: number, end: number) => void;
  showRange?: boolean;
}

export function AudioWaveform({
  audioUrl,
  className,
  onTimeUpdate,
  onDurationChange,
  startTime = 0,
  endTime,
  onRangeChange,
  showRange = false,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState<"start" | "end" | "playhead" | null>(null);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.src = audioUrl;

    const handleLoadedMetadata = () => {
      const dur = audio.duration;
      setDuration(dur);
      onDurationChange?.(dur);
      if (!endTime) {
        onRangeChange?.(0, dur);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", () => setIsPlaying(false));

    // Generate waveform data
    generateWaveform(audioUrl);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [audioUrl]);

  const generateWaveform = async (url: string) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const rawData = audioBuffer.getChannelData(0);
      const samples = 200;
      const blockSize = Math.floor(rawData.length / samples);
      const filteredData: number[] = [];

      for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j]);
        }
        filteredData.push(sum / blockSize);
      }

      const maxVal = Math.max(...filteredData);
      const normalizedData = filteredData.map((val) => val / maxVal);
      setWaveformData(normalizedData);
    } catch (error) {
      console.error("Failed to generate waveform:", error);
    }
  };

  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const barWidth = rect.width / waveformData.length;
    const centerY = rect.height / 2;

    waveformData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * rect.height * 0.8;

      const normalizedPos = index / waveformData.length;
      const isInRange = showRange
        ? normalizedPos >= startTime / duration && normalizedPos <= (endTime || duration) / duration
        : true;

      ctx.fillStyle = isInRange ? "hsl(262, 83%, 58%)" : "hsl(262, 83%, 58%, 0.3)";

      ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
    });

    // Draw playhead
    if (duration > 0) {
      const playheadX = (currentTime / duration) * rect.width;
      ctx.fillStyle = "#fff";
      ctx.fillRect(playheadX - 1, 0, 2, rect.height);
    }

    // Draw range handles if showing range
    if (showRange && duration > 0) {
      const startX = (startTime / duration) * rect.width;
      const endX = ((endTime || duration) / duration) * rect.width;

      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(startX - 4, 0, 8, rect.height);
      ctx.fillRect(endX - 4, 0, 8, rect.height);
    }
  }, [waveformData, currentTime, duration, startTime, endTime, showRange]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !audioRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <audio ref={audioRef} className="hidden" />
      <canvas
        ref={canvasRef}
        className="w-full h-32 cursor-pointer bg-card rounded-lg"
        onClick={handleCanvasClick}
      />
      <div className="flex items-center justify-center mt-4 gap-4">
        <button
          onClick={togglePlay}
          className="h-12 w-12 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          {isPlaying ? (
            <svg className="h-6 w-6 text-primary-foreground" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-primary-foreground ml-1" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
