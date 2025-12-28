"use client";

import { useState } from "react";
import { Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { VideoPlayer } from "@/components/tools/video-player";

const presets = [
  { name: "16:9", ratio: 16 / 9 },
  { name: "9:16", ratio: 9 / 16 },
  { name: "4:3", ratio: 4 / 3 },
  { name: "1:1", ratio: 1 },
  { name: "Custom", ratio: 0 },
];

export default function VideoCropPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState(0);
  const [cropHeight, setCropHeight] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);

  const handleUpload = (uploadedFiles: UploadedFile[]) => {
    setFiles(uploadedFiles);
    if (uploadedFiles[0]?.width && uploadedFiles[0]?.height) {
      setVideoWidth(uploadedFiles[0].width);
      setVideoHeight(uploadedFiles[0].height);
      setCropWidth(uploadedFiles[0].width);
      setCropHeight(uploadedFiles[0].height);
    }
  };

  const handleRemove = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const applyPreset = (ratio: number) => {
    if (ratio === 0) return;

    const currentRatio = videoWidth / videoHeight;
    if (ratio > currentRatio) {
      const newHeight = Math.floor(videoWidth / ratio);
      setCropWidth(videoWidth);
      setCropHeight(newHeight);
      setCropX(0);
      setCropY(Math.floor((videoHeight - newHeight) / 2));
    } else {
      const newWidth = Math.floor(videoHeight * ratio);
      setCropWidth(newWidth);
      setCropHeight(videoHeight);
      setCropX(Math.floor((videoWidth - newWidth) / 2));
      setCropY(0);
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    const response = await fetch("/api/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "video-crop",
        inputFileId: files[0].id,
        params: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
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
            <Crop className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Crop Video</h1>
            <p className="text-muted-foreground">Change the frame size and aspect ratio</p>
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
                  <CardTitle>Crop Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <VideoPlayer
                    src={`/api/download/${files[0].id}`}
                    className="aspect-video"
                  />

                  <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset.ratio)}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>X Position</Label>
                      <Input
                        type="number"
                        value={cropX}
                        onChange={(e) => setCropX(parseInt(e.target.value) || 0)}
                        min={0}
                        max={videoWidth - cropWidth}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Y Position</Label>
                      <Input
                        type="number"
                        value={cropY}
                        onChange={(e) => setCropY(parseInt(e.target.value) || 0)}
                        min={0}
                        max={videoHeight - cropHeight}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Width</Label>
                      <Input
                        type="number"
                        value={cropWidth}
                        onChange={(e) => setCropWidth(parseInt(e.target.value) || 0)}
                        min={1}
                        max={videoWidth - cropX}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height</Label>
                      <Input
                        type="number"
                        value={cropHeight}
                        onChange={(e) => setCropHeight(parseInt(e.target.value) || 0)}
                        min={1}
                        max={videoHeight - cropY}
                      />
                    </div>
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <Crop className="h-4 w-4 mr-2" />
                    Crop Video
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
