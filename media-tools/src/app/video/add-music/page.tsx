"use client";

import { useState } from "react";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { VideoPlayer } from "@/components/tools/video-player";

export default function VideoAddMusicPage() {
  const [videoFiles, setVideoFiles] = useState<UploadedFile[]>([]);
  const [audioFiles, setAudioFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState(0.5);

  const handleVideoUpload = (uploadedFiles: UploadedFile[]) => {
    setVideoFiles(uploadedFiles);
  };

  const handleAudioUpload = (uploadedFiles: UploadedFile[]) => {
    setAudioFiles(uploadedFiles);
  };

  const handleRemoveVideo = (id: string) => {
    setVideoFiles(videoFiles.filter((f) => f.id !== id));
  };

  const handleRemoveAudio = (id: string) => {
    setAudioFiles(audioFiles.filter((f) => f.id !== id));
  };

  const handleProcess = async () => {
    if (videoFiles.length === 0 || audioFiles.length === 0) return;

    const response = await fetch("/api/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "video-add-music",
        inputFileId: videoFiles[0].id,
        params: {
          audioFile: `/uploads/${audioFiles[0].id}.mp3`,
          audioVolume,
        },
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
            <Music className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Add Music to Video</h1>
            <p className="text-muted-foreground">Add background music to your video</p>
          </div>
        </div>

        {!taskId ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Video File</CardTitle>
              </CardHeader>
              <CardContent>
                {videoFiles.length === 0 ? (
                  <FileUpload
                    accept="video/*"
                    onUpload={handleVideoUpload}
                    className="min-h-[200px]"
                  />
                ) : (
                  <div className="space-y-4">
                    <FileList files={videoFiles} onRemove={handleRemoveVideo} />
                    <VideoPlayer
                      src={`/api/download/${videoFiles[0].id}`}
                      className="aspect-video"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audio File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {audioFiles.length === 0 ? (
                  <FileUpload
                    accept="audio/*"
                    onUpload={handleAudioUpload}
                    className="min-h-[200px]"
                  />
                ) : (
                  <div className="space-y-4">
                    <FileList files={audioFiles} onRemove={handleRemoveAudio} />

                    <div className="space-y-2">
                      <Label>Music Volume: {Math.round(audioVolume * 100)}%</Label>
                      <Slider
                        value={[audioVolume]}
                        min={0}
                        max={2}
                        step={0.1}
                        onValueChange={([val]) => setAudioVolume(val)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Adjust the volume of the background music relative to the original audio
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              <Button
                onClick={handleProcess}
                className="w-full"
                size="lg"
                disabled={videoFiles.length === 0 || audioFiles.length === 0}
              >
                <Music className="h-4 w-4 mr-2" />
                Add Music to Video
              </Button>
            </div>
          </div>
        ) : (
          <ProgressTracker taskId={taskId} />
        )}
      </div>
    </div>
  );
}
