"use client";

import { useState } from "react";
import { Video, Scissors, Crop, RotateCw, Volume2, Music, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { VideoPlayer } from "@/components/tools/video-player";
import { formatDuration } from "@/lib/utils";

export default function VideoEditorPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("trim");

  // Trim settings
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Speed & Volume
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);

  // Rotation
  const [rotation, setRotation] = useState(0);

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

    // For now, just do trim operation
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
            <Video className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Video Editor</h1>
            <p className="text-muted-foreground">Full-featured video editing suite</p>
          </div>
        </div>

        {!taskId ? (
          <>
            {files.length === 0 ? (
              <FileUpload
                accept="video/*"
                onUpload={handleUpload}
                className="min-h-[400px]"
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card>
                    <CardContent className="p-4">
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
                    </CardContent>
                  </Card>

                  <Card className="mt-4">
                    <CardContent className="p-4">
                      <FileList files={files} onRemove={handleRemove} />
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Edit Tools</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid grid-cols-3 w-full">
                          <TabsTrigger value="trim">
                            <Scissors className="h-4 w-4" />
                          </TabsTrigger>
                          <TabsTrigger value="adjust">
                            <Volume2 className="h-4 w-4" />
                          </TabsTrigger>
                          <TabsTrigger value="rotate">
                            <RotateCw className="h-4 w-4" />
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="trim" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Start: {formatDuration(startTime)}</Label>
                            <Slider
                              value={[startTime]}
                              max={duration}
                              step={0.1}
                              onValueChange={([val]) => setStartTime(Math.min(val, endTime - 0.1))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End: {formatDuration(endTime)}</Label>
                            <Slider
                              value={[endTime]}
                              max={duration}
                              step={0.1}
                              onValueChange={([val]) => setEndTime(Math.max(val, startTime + 0.1))}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Duration: {formatDuration(endTime - startTime)}
                          </p>
                        </TabsContent>

                        <TabsContent value="adjust" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Speed: {speed}x</Label>
                            <Slider
                              value={[speed]}
                              min={0.25}
                              max={4}
                              step={0.25}
                              onValueChange={([val]) => setSpeed(val)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Volume: {Math.round(volume * 100)}%</Label>
                            <Slider
                              value={[volume]}
                              min={0}
                              max={2}
                              step={0.1}
                              onValueChange={([val]) => setVolume(val)}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="rotate" className="space-y-4 mt-4">
                          <div className="flex justify-center gap-2">
                            {[0, 90, 180, 270].map((deg) => (
                              <Button
                                key={deg}
                                variant={rotation === deg ? "default" : "outline"}
                                size="sm"
                                onClick={() => setRotation(deg)}
                              >
                                {deg}°
                              </Button>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>

                      <Button onClick={handleProcess} className="w-full mt-6" size="lg">
                        Export Video
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </>
        ) : (
          <ProgressTracker taskId={taskId} />
        )}
      </div>
    </div>
  );
}
