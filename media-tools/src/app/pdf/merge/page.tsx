"use client";

import { useState } from "react";
import { FilePlus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";

export default function PDFMergePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);

  const handleUpload = (uploadedFiles: UploadedFile[]) => {
    setFiles([...files, ...uploadedFiles]);
  };

  const handleRemove = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleProcess = async () => {
    if (files.length < 2) return;

    const response = await fetch("/api/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pdf-merge",
        inputFileId: files[0].id,
        params: { files: files.map((f) => f.id) },
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
            <FilePlus className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Merge PDF</h1>
            <p className="text-muted-foreground">Combine multiple PDF files into one</p>
          </div>
        </div>

        {!taskId ? (
          <>
            <FileUpload
              accept=".pdf,application/pdf"
              multiple
              onUpload={handleUpload}
              className="min-h-[200px] mb-6"
            />

            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>PDF Files ({files.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {files.map((file, index) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <span className="text-muted-foreground w-6">{index + 1}.</span>
                      <div className="flex-1">
                        <p className="font-medium truncate">{file.name}</p>
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
                    <FilePlus className="h-4 w-4 mr-2" />
                    Merge {files.length} PDFs
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
