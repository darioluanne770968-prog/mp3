"use client";

import { useState } from "react";
import { Split } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";

export default function PDFSplitPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<"all" | "range" | "interval">("all");
  const [pageRange, setPageRange] = useState("");
  const [interval, setInterval] = useState(1);

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
        type: "pdf-split",
        inputFileId: files[0].id,
        params: { mode: splitMode, pageRange, interval },
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
            <Split className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Split PDF</h1>
            <p className="text-muted-foreground">Split PDF into separate pages or sections</p>
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
                  <CardTitle>Split Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FileList files={files} onRemove={handleRemove} />

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant={splitMode === "all" ? "default" : "outline"}
                        onClick={() => setSplitMode("all")}
                      >
                        Extract All Pages
                      </Button>
                      <Button
                        variant={splitMode === "range" ? "default" : "outline"}
                        onClick={() => setSplitMode("range")}
                      >
                        Page Range
                      </Button>
                      <Button
                        variant={splitMode === "interval" ? "default" : "outline"}
                        onClick={() => setSplitMode("interval")}
                      >
                        Every N Pages
                      </Button>
                    </div>

                    {splitMode === "range" && (
                      <div className="space-y-2">
                        <Label>Page Range (e.g., 1-3, 5, 7-10)</Label>
                        <Input
                          value={pageRange}
                          onChange={(e) => setPageRange(e.target.value)}
                          placeholder="1-3, 5, 7-10"
                        />
                      </div>
                    )}

                    {splitMode === "interval" && (
                      <div className="space-y-2">
                        <Label>Split every N pages</Label>
                        <Input
                          type="number"
                          value={interval}
                          onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                          min={1}
                        />
                      </div>
                    )}
                  </div>

                  <Button onClick={handleProcess} className="w-full" size="lg">
                    <Split className="h-4 w-4 mr-2" />
                    Split PDF
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
