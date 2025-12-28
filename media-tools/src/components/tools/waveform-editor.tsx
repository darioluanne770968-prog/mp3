"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Region {
  id: string;
  start: number;
  end: number;
  color: string;
}

interface WaveformEditorProps {
  audioUrl: string;
  onRegionChange?: (regions: Region[]) => void;
  onTimeChange?: (time: number) => void;
  height?: number;
}

export function WaveformEditor({
  audioUrl,
  onRegionChange,
  onTimeChange,
  height = 128,
}: WaveformEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isCreatingRegion, setIsCreatingRegion] = useState(false);
  const [regionStart, setRegionStart] = useState(0);

  // Load audio and decode
  useEffect(() => {
    const loadAudio = async () => {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);

      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        setAudioBuffer(buffer);
        setDuration(buffer.duration);
      } catch (error) {
        console.error("Error loading audio:", error);
      }
    };

    loadAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioUrl]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !audioBuffer) return;

    const { width } = canvas;
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / (width * zoom));
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.strokeStyle = "#333";
    ctx.beginPath();
    ctx.moveTo(0, amp);
    ctx.lineTo(width, amp);
    ctx.stroke();

    // Draw regions
    regions.forEach((region) => {
      const startX = ((region.start / duration) * width * zoom) - scrollOffset;
      const endX = ((region.end / duration) * width * zoom) - scrollOffset;
      ctx.fillStyle = region.color + "40";
      ctx.fillRect(startX, 0, endX - startX, height);
      ctx.strokeStyle = region.color;
      ctx.strokeRect(startX, 0, endX - startX, height);
    });

    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 1;

    const startSample = Math.floor((scrollOffset / (width * zoom)) * data.length);
    for (let i = 0; i < width; i++) {
      const sampleIndex = startSample + i * step;
      if (sampleIndex >= data.length) break;

      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[sampleIndex + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      const y1 = (1 + min) * amp;
      const y2 = (1 + max) * amp;
      ctx.moveTo(i, y1);
      ctx.lineTo(i, y2);
    }
    ctx.stroke();

    // Draw playhead
    const playheadX = ((currentTime / duration) * width * zoom) - scrollOffset;
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }

    // Draw time markers
    ctx.fillStyle = "#666";
    ctx.font = "10px monospace";
    const markerStep = Math.max(1, Math.floor(duration / (10 * zoom)));
    for (let t = 0; t <= duration; t += markerStep) {
      const x = ((t / duration) * width * zoom) - scrollOffset;
      if (x >= 0 && x <= width) {
        ctx.fillText(formatTime(t), x, height - 2);
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 10);
        ctx.stroke();
      }
    }
  }, [audioBuffer, height, currentTime, duration, zoom, scrollOffset, regions]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Animation loop for playback
  useEffect(() => {
    const updatePlayhead = () => {
      if (audioRef.current && isPlaying) {
        setCurrentTime(audioRef.current.currentTime);
        onTimeChange?.(audioRef.current.currentTime);
        animationRef.current = requestAnimationFrame(updatePlayhead);
      }
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updatePlayhead);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, onTimeChange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = ((x + scrollOffset) / (canvas.width * zoom)) * duration;

    if (e.shiftKey) {
      // Create region
      if (!isCreatingRegion) {
        setIsCreatingRegion(true);
        setRegionStart(clickTime);
      } else {
        const newRegion: Region = {
          id: `region-${Date.now()}`,
          start: Math.min(regionStart, clickTime),
          end: Math.max(regionStart, clickTime),
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        };
        const newRegions = [...regions, newRegion];
        setRegions(newRegions);
        onRegionChange?.(newRegions);
        setIsCreatingRegion(false);
      }
    } else {
      // Seek
      if (audioRef.current) {
        audioRef.current.currentTime = clickTime;
        setCurrentTime(clickTime);
      }
    }
  };

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const handleScroll = (e: React.WheelEvent) => {
    const delta = e.deltaX || e.deltaY;
    setScrollOffset((prev) => Math.max(0, prev + delta));
  };

  const deleteSelectedRegion = () => {
    if (selectedRegion) {
      const newRegions = regions.filter((r) => r.id !== selectedRegion);
      setRegions(newRegions);
      onRegionChange?.(newRegions);
      setSelectedRegion(null);
    }
  };

  const clearAllRegions = () => {
    setRegions([]);
    onRegionChange?.([]);
    setSelectedRegion(null);
  };

  return (
    <div className="space-y-4">
      <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />

      <div className="relative" onWheel={handleScroll}>
        <canvas
          ref={canvasRef}
          width={800}
          height={height}
          className="w-full cursor-crosshair rounded border border-gray-700"
          onClick={handleCanvasClick}
        />
        {isCreatingRegion && (
          <div className="absolute top-0 left-0 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1">
            按住 Shift 点击结束位置创建选区
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePlay}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            {isPlaying ? "⏸️ 暂停" : "▶️ 播放"}
          </Button>
          <Button
            onClick={handleStop}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            ⏹️ 停止
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>时间:</span>
          <span className="font-mono text-white">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">缩放:</span>
          <Slider
            value={[zoom]}
            min={1}
            max={10}
            step={0.5}
            onValueChange={handleZoomChange}
            className="w-32"
          />
          <span className="text-sm text-white">{zoom}x</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={deleteSelectedRegion}
            variant="outline"
            size="sm"
            disabled={!selectedRegion}
            className="border-gray-600 text-red-400"
          >
            删除选区
          </Button>
          <Button
            onClick={clearAllRegions}
            variant="outline"
            size="sm"
            disabled={regions.length === 0}
            className="border-gray-600"
          >
            清除所有
          </Button>
        </div>
      </div>

      {regions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400">选区列表</h4>
          <div className="space-y-1">
            {regions.map((region) => (
              <div
                key={region.id}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                  selectedRegion === region.id
                    ? "bg-purple-900/50 border border-purple-500"
                    : "bg-gray-800/50 hover:bg-gray-700/50"
                }`}
                onClick={() => setSelectedRegion(region.id)}
              >
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: region.color }}
                />
                <span className="text-sm text-white">
                  {formatTime(region.start)} - {formatTime(region.end)}
                </span>
                <span className="text-sm text-gray-400">
                  ({formatTime(region.end - region.start)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        💡 提示: 点击波形跳转播放位置，按住 Shift 点击两次创建选区，滚轮水平滚动
      </p>
    </div>
  );
}
