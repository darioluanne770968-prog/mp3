"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";

export default function PDFRotatePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [rotation, setRotation] = useState("90");
  const [pages, setPages] = useState("all");

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
        type: "pdf-rotate",
        inputFileId: files[0].id,
        params: { rotation: parseInt(rotation), pages },
      }),
    });

    const data = await response.json();
    setTaskId(data.taskId);
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-red-600 flex items-center justify-center">
            <RotateCw className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Rotate PDF</h1>
            <p className="text-muted-foreground">Rotate PDF pages to any angle</p>
          </div>
        </div>

        {!taskId ? (
          <>
            {files.length === 0 ? (
              <FileUpload
                accept=".pdf,application/pdf"
                onUpload={handleUpload}
                className="min-h-[300px]"
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Rotation Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <div className="flex justify-center gap-4 py-4">
                    {["90", "180", "270"].map((deg) => (
                      <Button
                        key={deg}
                        variant={rotation === deg ? "default" : "outline"}
                        size="lg"
                        onClick={() => setRotation(deg)}
                        className="flex-col h-20 w-24"
                      >
                        <RotateCw
                          className="h-6 w-6 mb-1"
                          style={{ transform: `rotate(${deg}deg)` }}
                        />
                        <span className="text-xs">{deg}°</span>
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Apply to Pages</Label>
                    <Select value={pages} onValueChange={setPages}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Pages</SelectItem>
                        <SelectItem value="odd">Odd Pages Only</SelectItem>
                        <SelectItem value="even">Even Pages Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <RotateCw className="h-4 w-4 mr-2" />
                    Rotate PDF
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
