"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { VideoPlayer } from "@/components/tools/video-player";

const rotationOptions = [
  { label: "90° CW", value: 90, icon: "↷" },
  { label: "180°", value: 180, icon: "↺↻" },
  { label: "90° CCW", value: 270, icon: "↶" },
];

export default function VideoRotatePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [rotation, setRotation] = useState(90);

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
        type: "video-rotate",
        inputFileId: files[0].id,
        params: { degrees: rotation },
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
            <RotateCw className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Rotate Video</h1>
            <p className="text-muted-foreground">Rotate or flip your video</p>
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
                  <CardTitle>Rotation Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <VideoPlayer
                    src={`/api/download/${files[0].id}`}
                    className="aspect-video"
                  />

                  <div className="flex justify-center gap-4">
                    {rotationOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={rotation === option.value ? "default" : "outline"}
                        size="lg"
                        onClick={() => setRotation(option.value)}
                        className="flex-col h-20 w-24"
                      >
                        <span className="text-2xl mb-1">{option.icon}</span>
                        <span className="text-xs">{option.label}</span>
                      </Button>
                    ))}
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <RotateCw className="h-4 w-4 mr-2" />
                    Rotate Video
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
