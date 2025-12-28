"use client";

import { useState } from "react";
import { Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";
import { AudioWaveform } from "@/components/tools/audio-waveform";

const presets = [
  { name: "Flat", bass: 0, mid: 0, treble: 0 },
  { name: "Bass Boost", bass: 6, mid: 0, treble: -2 },
  { name: "Treble Boost", bass: -2, mid: 0, treble: 6 },
  { name: "Vocal", bass: -3, mid: 4, treble: 2 },
  { name: "Rock", bass: 4, mid: -2, treble: 4 },
  { name: "Pop", bass: 2, mid: 3, treble: 2 },
];

export default function AudioEqualizerPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [bass, setBass] = useState(0);
  const [mid, setMid] = useState(0);
  const [treble, setTreble] = useState(0);

  const handleUpload = (uploadedFiles: UploadedFile[]) => {
    setFiles(uploadedFiles);
  };

  const handleRemove = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setBass(preset.bass);
    setMid(preset.mid);
    setTreble(preset.treble);
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    const response = await fetch("/api/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "audio-equalizer",
        inputFileId: files[0].id,
        params: { bass, mid, treble },
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
            <Sliders className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Audio Equalizer</h1>
            <p className="text-muted-foreground">Adjust bass, mid, and treble frequencies</p>
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
                  <CardTitle>Equalizer Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <AudioWaveform audioUrl={`/api/download/${files[0].id}`} />

                  <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-8">
                    <div className="space-y-4">
                      <Label className="text-center block">Bass (100Hz)</Label>
                      <div className="h-48 flex justify-center">
                        <div className="relative w-8">
                          <Slider
                            orientation="vertical"
                            value={[bass]}
                            min={-12}
                            max={12}
                            step={1}
                            onValueChange={([val]) => setBass(val)}
                            className="h-full"
                          />
                        </div>
                      </div>
                      <p className="text-center text-sm font-medium">{bass > 0 ? "+" : ""}{bass} dB</p>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-center block">Mid (1kHz)</Label>
                      <div className="h-48 flex justify-center">
                        <div className="relative w-8">
                          <Slider
                            orientation="vertical"
                            value={[mid]}
                            min={-12}
                            max={12}
                            step={1}
                            onValueChange={([val]) => setMid(val)}
                            className="h-full"
                          />
                        </div>
                      </div>
                      <p className="text-center text-sm font-medium">{mid > 0 ? "+" : ""}{mid} dB</p>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-center block">Treble (8kHz)</Label>
                      <div className="h-48 flex justify-center">
                        <div className="relative w-8">
                          <Slider
                            orientation="vertical"
                            value={[treble]}
                            min={-12}
                            max={12}
                            step={1}
                            onValueChange={([val]) => setTreble(val)}
                            className="h-full"
                          />
                        </div>
                      </div>
                      <p className="text-center text-sm font-medium">{treble > 0 ? "+" : ""}{treble} dB</p>
                    </div>
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <Sliders className="h-4 w-4 mr-2" />
                    Apply Equalizer
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
