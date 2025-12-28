"use client";

import { useState } from "react";
import { Merge, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";

export default function AudioMergePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);

  const handleUpload = (uploadedFiles: UploadedFile[]) => {
    setFiles([...files, ...uploadedFiles]);
  };

  const handleRemove = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...files];
    const [removed] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, removed);
    setFiles(newFiles);
  };

  const handleProcess = async () => {
    if (files.length < 2) return;

    const response = await fetch("/api/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "audio-merge",
        inputFileId: files[0].id,
        params: { files: files.map((f) => `/uploads/${f.id}.mp3`) },
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
            <Merge className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Merge Audio</h1>
            <p className="text-muted-foreground">Combine multiple audio files into one</p>
          </div>
        </div>

        {!taskId ? (
          <>
            <FileUpload
              accept="audio/*"
              multiple
              onUpload={handleUpload}
              className="min-h-[200px] mb-6"
            />

            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Audio Files (Drag to reorder)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {files.map((file, index) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <div className="flex-1">
                        <p className="font-medium">{file.name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(file.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}

                  <Button
                    onClick={handleProcess}
                    className="w-full"
                    size="lg"
                    disabled={files.length < 2}
                  >
                    <Merge className="h-4 w-4 mr-2" />
                    Merge {files.length} Files
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
