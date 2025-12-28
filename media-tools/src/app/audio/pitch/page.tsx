"use client";

import { useState } from "react";
import { Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { AudioWaveform } from "@/components/tools/audio-waveform";

export default function AudioPitchPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [semitones, setSemitones] = useState(0);

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
        type: "audio-pitch",
        inputFileId: files[0].id,
        params: { semitones },
      }),
    });

    const data = await response.json();
    setTaskId(data.taskId);
  };

  const getPitchLabel = () => {
    if (semitones === 0) return "Original";
    if (semitones > 0) return `+${semitones} semitones (Higher)`;
    return `${semitones} semitones (Lower)`;
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-purple-600 flex items-center justify-center">
            <Music2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Change Pitch</h1>
            <p className="text-muted-foreground">Shift the pitch of your audio up or down</p>
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
                  <CardTitle>Pitch Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <AudioWaveform audioUrl={`/api/download/${files[0].id}`} />

                  <div className="space-y-4">
                    <Label>Pitch: {getPitchLabel()}</Label>
                    <Slider
                      value={[semitones]}
                      min={-12}
                      max={12}
                      step={1}
                      onValueChange={([val]) => setSemitones(val)}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>-12 (1 octave down)</span>
                      <span>0</span>
                      <span>+12 (1 octave up)</span>
                    </div>
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <Music2 className="h-4 w-4 mr-2" />
                    Apply Pitch Change
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
