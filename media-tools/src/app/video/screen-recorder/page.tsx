"use client";

import { useState, useRef, useEffect } from "react";
import { MonitorPlay, Square, Download, Trash2, Play, Pause, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDuration } from "@/lib/utils";

export default function ScreenRecorderPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  const startRecording = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: includeAudio,
      });

      let combinedStream = displayStream;

      if (includeAudio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioTrack = audioStream.getAudioTracks()[0];
          combinedStream = new MediaStream([
            ...displayStream.getVideoTracks(),
            audioTrack,
          ]);
        } catch {
          console.warn("Could not get microphone access");
        }
      }

      setStream(combinedStream);

      if (previewRef.current) {
        previewRef.current.srcObject = combinedStream;
        previewRef.current.play();
      }

      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: "video/webm;codecs=vp9",
      });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoURL(url);
        combinedStream.getTracks().forEach((track) => track.stop());
        setStream(null);
      };

      // Handle when user stops sharing
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Could not start screen recording. Please grant permission and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (previewRef.current) {
        previewRef.current.srcObject = null;
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current || !videoURL) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!videoURL) return;

    const a = document.createElement("a");
    a.href = videoURL;
    a.download = `screen-recording-${Date.now()}.webm`;
    a.click();
  };

  const handleDelete = () => {
    if (videoURL) {
      URL.revokeObjectURL(videoURL);
    }
    setVideoURL(null);
    setDuration(0);
    setIsPlaying(false);
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
            <MonitorPlay className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Screen Recorder</h1>
            <p className="text-muted-foreground">Record your screen directly in the browser</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recording</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {videoURL ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoURL}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-contain"
                  controls
                />
              </div>
            ) : isRecording ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={previewRef}
                  className="w-full h-full object-contain"
                  muted
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center">
                <MonitorPlay className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Click Start Recording to begin</p>
              </div>
            )}

            {isRecording && (
              <div className="flex items-center justify-center gap-4">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xl font-mono">{formatDuration(duration)}</span>
              </div>
            )}

            {!isRecording && !videoURL && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  {includeAudio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  <Label htmlFor="include-audio">Include Microphone</Label>
                </div>
                <Switch
                  id="include-audio"
                  checked={includeAudio}
                  onCheckedChange={setIncludeAudio}
                />
              </div>
            )}

            <div className="flex justify-center gap-4">
              {isRecording ? (
                <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                  <Square className="h-4 w-4" />
                  Stop Recording
                </Button>
              ) : videoURL ? (
                <>
                  <Button onClick={togglePlay} variant="outline" size="lg" className="gap-2">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? "Pause" : "Play"}
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
                  <MonitorPlay className="h-4 w-4" />
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
