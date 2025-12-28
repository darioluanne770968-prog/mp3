"use client";

import { useState } from "react";
import { Volume1 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { VideoPlayer } from "@/components/tools/video-player";

export default function VideoVolumePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);

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
        type: "video-volume",
        inputFileId: files[0].id,
        params: { volume },
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
            <Volume1 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Adjust Video Volume</h1>
            <p className="text-muted-foreground">Change the audio volume of your video</p>
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
                  <CardTitle>Volume Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <VideoPlayer
                    src={`/api/download/${files[0].id}`}
                    className="aspect-video"
                  />

                  <div className="space-y-4">
                    <Label>Volume: {Math.round(volume * 100)}%</Label>
                    <Slider
                      value={[volume]}
                      min={0}
                      max={3}
                      step={0.1}
                      onValueChange={([val]) => setVolume(val)}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Mute</span>
                      <span>100%</span>
                      <span>300%</span>
                    </div>
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <Volume1 className="h-4 w-4 mr-2" />
                    Apply Volume Change
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
