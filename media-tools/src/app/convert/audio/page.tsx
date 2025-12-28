"use client";

import { useState } from "react";
import { FileAudio, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";

const audioFormats = [
  { value: "mp3", label: "MP3", description: "Most compatible format" },
  { value: "wav", label: "WAV", description: "Uncompressed, high quality" },
  { value: "m4a", label: "M4A/AAC", description: "Apple format, good quality" },
  { value: "ogg", label: "OGG", description: "Open source format" },
  { value: "flac", label: "FLAC", description: "Lossless compression" },
  { value: "wma", label: "WMA", description: "Windows Media Audio" },
];

export default function AudioConverterPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState("mp3");

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
        type: "audio-convert",
        inputFileId: files[0].id,
        params: { format: outputFormat },
      }),
    });

    const data = await response.json();
    setTaskId(data.taskId);
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-green-600 flex items-center justify-center">
            <FileAudio className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Audio Converter</h1>
            <p className="text-muted-foreground">Convert audio files to any format</p>
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
                  <CardTitle>Conversion Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <div className="flex items-center justify-center gap-4 py-4">
                    <div className="text-center">
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2">
                        <FileAudio className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-medium">
                        {files[0]?.name.split(".").pop()?.toUpperCase()}
                      </p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    <div className="text-center">
                      <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <FileAudio className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-primary">
                        {outputFormat.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select value={outputFormat} onValueChange={setOutputFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {audioFormats.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            <span className="font-medium">{format.label}</span>
                            <span className="text-muted-foreground ml-2">
                              - {format.description}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <FileAudio className="h-4 w-4 mr-2" />
                    Convert to {outputFormat.toUpperCase()}
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
