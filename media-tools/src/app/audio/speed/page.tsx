"use client";

import { useState } from "react";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { AudioWaveform } from "@/components/tools/audio-waveform";

const speedPresets = [
  { label: "0.5x", value: 0.5 },
  { label: "0.75x", value: 0.75 },
  { label: "1x", value: 1 },
  { label: "1.25x", value: 1.25 },
  { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2 },
];

export default function AudioSpeedPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);

  const handleUpload = (uploadedFiles: UploadedFile[]) => {
    setFiles(uploadedFiles);
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
        type: "audio-speed",
        inputFileId: files[0].id,
        params: { speed },
      }),
    });

    const data = await response.json();
    setTaskId(data.taskId);
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-purple-600 flex items-center justify-center">
            <Gauge className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Change Speed</h1>
            <p className="text-muted-foreground">Speed up or slow down your audio</p>
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
                  <CardTitle>Speed Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <AudioWaveform audioUrl={`/api/download/${files[0].id}`} />

                  <div className="space-y-4">
                    <Label>Speed: {speed}x</Label>
                    <div className="flex gap-2">
                      {speedPresets.map((preset) => (
                        <Button
                          key={preset.value}
                          variant={speed === preset.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSpeed(preset.value)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                    <Slider
                      value={[speed]}
                      min={0.25}
                      max={4}
                      step={0.05}
                      onValueChange={([val]) => setSpeed(val)}
                    />
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <Gauge className="h-4 w-4 mr-2" />
                    Apply Speed Change
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
