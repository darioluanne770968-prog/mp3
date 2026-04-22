"use client";

import { useState } from "react";
import { Package, ArrowRight, FolderArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { ProgressTracker } from "@/components/tools/progress-tracker";

const archiveFormats = [
  { value: "zip", label: "ZIP", description: "Most compatible" },
  { value: "7z", label: "7Z", description: "High compression" },
];

export default function ArchiveToolsPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("compress");
  const [outputFormat, setOutputFormat] = useState("zip");

  const handleUpload = (uploadedFiles: UploadedFile[]) => {
    setFiles([...files, ...uploadedFiles]);
  };

  const handleRemove = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleCompress = async () => {
    if (files.length === 0) return;

    const response = await fetch("/api/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "compress-archive",
        inputFileId: files[0].id,
        params: {
          files: files.map(f => f.id),
          format: outputFormat,
        },
      }),
    });

    const data = await response.json();
    setTaskId(data.taskId);
  };

  const handleExtract = async () => {
    if (files.length === 0) return;

    const response = await fetch("/api/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "archive-extract",
        inputFileId: files[0].id,
        params: {},
      }),
    });

    const data = await response.json();
    setTaskId(data.taskId);
  };

  if (taskId) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <ProgressTracker taskId={taskId} />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-green-600 flex items-center justify-center">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Archive Tools</h1>
            <p className="text-muted-foreground">Compress and extract archive files</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="compress">Compress Files</TabsTrigger>
                <TabsTrigger value="extract">Extract Archive</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <TabsContent value="compress" className="space-y-6 mt-0">
              <FileUpload
                accept="*/*"
                multiple
                onUpload={handleUpload}
                className="min-h-[150px]"
              />

              {files.length > 0 && (
                <>
                  <FileList files={files} onRemove={handleRemove} />

                  <div className="flex items-center justify-center gap-4 py-4">
                    <div className="text-center">
                      <p className="text-sm font-medium">{files.length} files</p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <FolderArchive className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-primary">
                        .{outputFormat.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Archive Format</Label>
                    <Select value={outputFormat} onValueChange={setOutputFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {archiveFormats.map((format) => (
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

                  <Button onClick={handleCompress} className="w-full" size="lg">
                    <Package className="h-4 w-4 mr-2" />
                    Compress to {outputFormat.toUpperCase()}
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="extract" className="space-y-6 mt-0">
              <FileUpload
                accept=".zip,.rar,.7z,.tar,.tar.gz,.tgz"
                onUpload={handleUpload}
                className="min-h-[200px]"
              />

              {files.length > 0 && (
                <>
                  <FileList files={files} onRemove={handleRemove} />

                  <Button onClick={handleExtract} className="w-full" size="lg">
                    <FolderArchive className="h-4 w-4 mr-2" />
                    Extract Archive
                  </Button>
                </>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
