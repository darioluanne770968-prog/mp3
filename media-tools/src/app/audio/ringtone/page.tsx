"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { AudioWaveform } from "@/components/tools/audio-waveform";
import { formatDuration } from "@/lib/utils";

export default function RingtonePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [ringtoneDuration, setRingtoneDuration] = useState(30);
  const [fadeIn, setFadeIn] = useState(0.5);
  const [fadeOut, setFadeOut] = useState(0.5);
  const [format, setFormat] = useState("m4r");

  const handleUpload = (uploadedFiles: UploadedFile[]) => {
    setFiles(uploadedFiles);
    if (uploadedFiles[0]?.duration) {
      setDuration(uploadedFiles[0].duration);
    }
  };

  const handleRemove = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    const response = await fetch("/api/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "audio-ringtone",
        inputFileId: files[0].id,
        params: {
          start: startTime,
          duration: Math.min(ringtoneDuration, duration - startTime),
          fadeIn,
          fadeOut,
          format,
        },
      }),
    });

    const data = await response.json();
    setTaskId(data.taskId);
  };

  const maxDuration = Math.min(40, duration - startTime);
  const actualDuration = Math.min(ringtoneDuration, maxDuration);

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-purple-600 flex items-center justify-center">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Ringtone Maker</h1>
            <p className="text-muted-foreground">Create custom phone ringtones</p>
          </div>
        </div>

        {!taskId ? (
          <>
            {files.length === 0 ? (
              <FileUpload
                accept="audio/*"
                onUpload={handleUpload}
                className="min-h-[300px]"
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Ringtone Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <AudioWaveform
                    audioUrl={`/api/download/${files[0].id}`}
                    onDurationChange={(d) => setDuration(d)}
                    showRange
                    startTime={startTime}
                    endTime={startTime + actualDuration}
                  />

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Start Time: {formatDuration(startTime)}</Label>
                      <Slider
                        value={[startTime]}
                        max={Math.max(0, duration - 5)}
                        step={0.1}
                        onValueChange={([val]) => setStartTime(val)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Duration: {actualDuration}s (max 40s)</Label>
                      <Slider
                        value={[ringtoneDuration]}
                        min={5}
                        max={40}
                        step={1}
                        onValueChange={([val]) => setRingtoneDuration(val)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Fade In: {fadeIn}s</Label>
                      <Slider
                        value={[fadeIn]}
                        max={3}
                        step={0.1}
                        onValueChange={([val]) => setFadeIn(val)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Fade Out: {fadeOut}s</Label>
                      <Slider
                        value={[fadeOut]}
                        max={3}
                        step={0.1}
                        onValueChange={([val]) => setFadeOut(val)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m4r">M4R (iPhone)</SelectItem>
                        <SelectItem value="mp3">MP3 (Android/Universal)</SelectItem>
                        <SelectItem value="ogg">OGG (Android)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <Bell className="h-4 w-4 mr-2" />
                    Create Ringtone
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <ProgressTracker
            taskId={taskId}
            onComplete={() => {}}
            onError={(error) => console.error(error)}
          />
        )}
      </div>
    </div>
  );
}
