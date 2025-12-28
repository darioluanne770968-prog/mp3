"use client";

import { useState } from "react";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { VideoPlayer } from "@/components/tools/video-player";

const speedPresets = [
  { label: "0.25x", value: 0.25 },
  { label: "0.5x", value: 0.5 },
  { label: "1x", value: 1 },
  { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2 },
  { label: "4x", value: 4 },
];

export default function VideoSpeedPage() {
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
        type: "video-speed",
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
          <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
            <Gauge className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Change Video Speed</h1>
            <p className="text-muted-foreground">Speed up or slow down your video</p>
          </div>
        </div>

        {!taskId ? (
          <>
            {files.length === 0 ? (
              <FileUpload
                accept="video/*"
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

                  <VideoPlayer
                    src={`/api/download/${files[0].id}`}
                    className="aspect-video"
                  />

                  <div className="space-y-4">
                    <Label>Speed: {speed}x</Label>
                    <div className="flex flex-wrap gap-2">
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
                      min={0.1}
                      max={4}
                      step={0.05}
                      onValueChange={([val]) => setSpeed(val)}
                    />
                    <p className="text-sm text-muted-foreground">
                      {speed < 1 ? "Slow motion effect" : speed > 1 ? "Fast forward effect" : "Normal speed"}
                    </p>
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
          <ProgressTracker taskId={taskId} />
        )}
      </div>
    </div>
  );
}
