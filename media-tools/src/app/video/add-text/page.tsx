"use client";

import { useState } from "react";
import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";
import { VideoPlayer } from "@/components/tools/video-player";
import { ProgressTracker } from "@/components/tools/progress-tracker";

export default function VideoAddTextPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [position, setPosition] = useState("center");
  const [fontSize, setFontSize] = useState("medium");
  const [color, setColor] = useState("#ffffff");

  const handleUpload = (uploadedFiles: UploadedFile[]) => {
    setFiles(uploadedFiles);
  };

  const handleRemove = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleProcess = async () => {
    if (files.length === 0 || !text.trim()) return;

    const fontSizeMap: Record<string, number> = {
      small: 32,
      medium: 48,
      large: 72,
    };

    const response = await fetch("/api/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "video-add-text",
        inputFileId: files[0].id,
        params: {
          text: text.trim(),
          position: position as "top" | "center" | "bottom",
          fontSize: fontSizeMap[fontSize] || 48,
          fontColor: color,
          backgroundColor: "black@0.5",
        },
      }),
    });

    const data = await response.json();
    setTaskId(data.taskId);
  };

  if (taskId) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <ProgressTracker
            taskId={taskId}
            onComplete={() => {}}
            onError={(error) => console.error(error)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
            <Type className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Add Text to Video</h1>
            <p className="text-muted-foreground">Add captions, titles, or watermarks</p>
          </div>
        </div>

        {files.length === 0 ? (
          <FileUpload
            accept="video/*"
            onUpload={handleUpload}
            className="min-h-[300px]"
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-4">
                  <VideoPlayer
                    src={`/api/download/${files[0].id}`}
                    className="aspect-video"
                  />
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardContent className="p-4">
                  <FileList files={files} onRemove={handleRemove} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Text Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Text</Label>
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter your text..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input value={color} onChange={(e) => setColor(e.target.value)} />
                  </div>
                </div>

                <Button
                  onClick={handleProcess}
                  className="w-full"
                  size="lg"
                  disabled={!text.trim()}
                >
                  <Type className="h-4 w-4 mr-2" />
                  Add Text to Video
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
