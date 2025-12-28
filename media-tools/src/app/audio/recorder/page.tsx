"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Download, Trash2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";

export default function AudioRecorderPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Could not access microphone. Please grant permission and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioURL) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!audioURL) return;

    const a = document.createElement("a");
    a.href = audioURL;
    a.download = `recording-${Date.now()}.webm`;
    a.click();
  };

  const handleDelete = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL(null);
    setDuration(0);
    setIsPlaying(false);
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-purple-600 flex items-center justify-center">
            <Mic className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Voice Recorder</h1>
            <p className="text-muted-foreground">Record audio directly from your microphone</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recording</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {audioURL && (
              <audio
                ref={audioRef}
                src={audioURL}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            )}

            <div className="flex flex-col items-center justify-center py-12">
              {isRecording ? (
                <>
                  <div className="relative">
                    <div className="h-32 w-32 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                      <Mic className="h-16 w-16 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping" />
                  </div>
                  <p className="mt-6 text-2xl font-mono">{formatDuration(duration)}</p>
                  <p className="text-muted-foreground">Recording...</p>
                </>
              ) : audioURL ? (
                <>
                  <div className="h-32 w-32 rounded-full bg-primary flex items-center justify-center">
                    <Mic className="h-16 w-16 text-primary-foreground" />
                  </div>
                  <p className="mt-6 text-2xl font-mono">{formatDuration(duration)}</p>
                  <p className="text-muted-foreground">Recording complete</p>
                </>
              ) : (
                <>
                  <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center">
                    <Mic className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <p className="mt-6 text-muted-foreground">
                    Click the button below to start recording
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-center gap-4">
              {isRecording ? (
                <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                  <Square className="h-4 w-4" />
                  Stop Recording
                </Button>
              ) : audioURL ? (
                <>
                  <Button onClick={togglePlay} variant="outline" size="lg" className="gap-2">
                    {isPlaying ? (
                      <>
                        <Pause className="h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Play
                      </>
                    )}
                  </Button>
                  <Button onClick={handleDownload} size="lg" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button onClick={handleDelete} variant="destructive" size="lg" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              ) : (
                <Button onClick={startRecording} size="lg" className="gap-2">
                  <Mic className="h-4 w-4" />
                  Start Recording
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
