"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { VideoPlayer } from "@/components/tools/video-player";

export default function VideoLoopPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loopCount, setLoopCount] = useState(2);

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
        type: "video-loop",
        inputFileId: files[0].id,
        params: { times: loopCount },
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
            <Repeat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Loop Video</h1>
            <p className="text-muted-foreground">Repeat your video multiple times</p>
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
                  <CardTitle>Loop Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <VideoPlayer
                    src={`/api/download/${files[0].id}`}
                    className="aspect-video"
                  />

                  <div className="space-y-4">
                    <Label>Loop Count: {loopCount} times</Label>
                    <div className="flex gap-2">
                      {[2, 3, 4, 5, 10].map((count) => (
                        <Button
                          key={count}
                          variant={loopCount === count ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLoopCount(count)}
                        >
                          {count}x
                        </Button>
                      ))}
                    </div>
                    <Slider
                      value={[loopCount]}
                      min={2}
                      max={20}
                      step={1}
                      onValueChange={([val]) => setLoopCount(val)}
                    />
                    <p className="text-sm text-muted-foreground">
                      The video will repeat {loopCount} times
                    </p>
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <Repeat className="h-4 w-4 mr-2" />
                    Create Looped Video
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
