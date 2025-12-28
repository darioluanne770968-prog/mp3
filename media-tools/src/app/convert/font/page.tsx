"use client";

import { useState } from "react";
import { Type, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileUpload, FileList, UploadedFile } from "@/components/tools/file-upload";

const fontFormats = [
  { value: "ttf", label: "TTF", description: "TrueType Font" },
  { value: "otf", label: "OTF", description: "OpenType Font" },
  { value: "woff", label: "WOFF", description: "Web Open Font Format" },
  { value: "woff2", label: "WOFF2", description: "Web Open Font Format 2" },
  { value: "eot", label: "EOT", description: "Embedded OpenType" },
];

export default function FontConverterPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [outputFormat, setOutputFormat] = useState("woff2");

  const handleUpload = (uploadedFiles: UploadedFile[]) => {
    setFiles(uploadedFiles);
  };

  const handleRemove = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-green-600 flex items-center justify-center">
            <Type className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Font Converter</h1>
            <p className="text-muted-foreground">Convert fonts between formats</p>
          </div>
        </div>

        {files.length === 0 ? (
          <FileUpload
            accept=".ttf,.otf,.woff,.woff2,.eot"
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
                    <Type className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">
                    {files[0]?.name.split(".").pop()?.toUpperCase()}
                  </p>
                </div>
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
                <div className="text-center">
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Type className="h-8 w-8 text-primary" />
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
                    {fontFormats.map((format) => (
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

              <div className="p-4 bg-muted rounded-lg text-center text-sm text-muted-foreground">
                Font conversion feature coming soon!
              </div>

              <Button className="w-full" size="lg" disabled>
                <Type className="h-4 w-4 mr-2" />
                Convert (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
