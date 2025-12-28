"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { AudioWaveform } from "@/components/tools/audio-waveform";

export default function AudioVolumePage() {
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
        type: "audio-volume",
        inputFileId: files[0].id,
        params: { volume },
      }),
    });

    const data = await response.json();
    setTaskId(data.taskId);
  };

  const getVolumeLabel = () => {
    if (volume === 1) return "100% (Original)";
    if (volume < 1) return `${Math.round(volume * 100)}% (Quieter)`;
    return `${Math.round(volume * 100)}% (Louder)`;
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-purple-600 flex items-center justify-center">
            <Volume2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Change Volume</h1>
            <p className="text-muted-foreground">Adjust the volume of your audio files</p>
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
                  <CardTitle>Volume Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <AudioWaveform audioUrl={`/api/download/${files[0].id}`} />

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Volume: {getVolumeLabel()}</Label>
                      <Slider
                        value={[volume]}
                        min={0.1}
                        max={3}
                        step={0.1}
                        onValueChange={([val]) => setVolume(val)}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>10%</span>
                        <span>100%</span>
                        <span>300%</span>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <Volume2 className="h-4 w-4 mr-2" />
                    Apply Volume Change
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
