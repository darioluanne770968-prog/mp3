"use client";

import { useState } from "react";
import { VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { AudioWaveform } from "@/components/tools/audio-waveform";

export default function VocalRemovePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);

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
        type: "audio-vocal-remove",
        inputFileId: files[0].id,
        params: {},
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
            <VolumeX className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Remove Vocals</h1>
            <p className="text-muted-foreground">Extract instrumental track from songs</p>
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
                  <CardTitle>Selected File</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <AudioWaveform audioUrl={`/api/download/${files[0].id}`} />

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">How it works</h4>
                    <p className="text-sm text-muted-foreground">
                      This tool uses audio processing techniques to separate vocals from the
                      instrumental track. Works best with stereo recordings where vocals are
                      centered in the mix. Results may vary depending on the source material.
                    </p>
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <VolumeX className="h-4 w-4 mr-2" />
                    Remove Vocals
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
