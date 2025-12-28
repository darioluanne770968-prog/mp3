"use client";

import { useState } from "react";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { VideoPlayer } from "@/components/tools/video-player";
import { formatDuration } from "@/lib/utils";

export default function VideoTrimPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const handleUpload = (uploadedFiles: UploadedFile[]) => {
    setFiles(uploadedFiles);
    if (uploadedFiles[0]?.duration) {
      setDuration(uploadedFiles[0].duration);
      setEndTime(uploadedFiles[0].duration);
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
        type: "video-trim",
        inputFileId: files[0].id,
        params: { start: startTime, end: endTime },
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
            <Scissors className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Trim Video</h1>
            <p className="text-muted-foreground">Cut and trim your video clips</p>
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
                  <CardTitle>Trim Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <VideoPlayer
                    src={`/api/download/${files[0].id}`}
                    className="aspect-video"
                    onDurationChange={(d) => {
                      setDuration(d);
                      if (endTime === 0) setEndTime(d);
                    }}
                    startTime={startTime}
                    endTime={endTime}
                  />

                  <div className="space-y-4">
                    <Label>
                      Trim Range: {formatDuration(startTime)} - {formatDuration(endTime)}
                    </Label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Start</Label>
                        <Slider
                          value={[startTime]}
                          max={duration}
                          step={0.1}
                          onValueChange={([val]) => setStartTime(Math.min(val, endTime - 0.1))}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">End</Label>
                        <Slider
                          value={[endTime]}
                          max={duration}
                          step={0.1}
                          onValueChange={([val]) => setEndTime(Math.max(val, startTime + 0.1))}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Output Duration: {formatDuration(endTime - startTime)}
                    </div>
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <Scissors className="h-4 w-4 mr-2" />
                    Trim Video
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
