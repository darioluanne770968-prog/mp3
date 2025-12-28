"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { videoFilters } from "@/lib/video-filters";

export default function VideoFiltersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [filterParams, setFilterParams] = useState<Record<string, Record<string, number>>>({});
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResultUrl("");
    }
  };

  const toggleFilter = (filterName: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterName)
        ? prev.filter((f) => f !== filterName)
        : [...prev, filterName]
    );
  };

  const updateFilterParam = (filterName: string, paramName: string, value: number) => {
    setFilterParams((prev) => ({
      ...prev,
      [filterName]: {
        ...prev[filterName],
        [paramName]: value,
      },
    }));
  };

  const handleProcess = async () => {
    if (!file || selectedFilters.length === 0) return;

    setProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filters", JSON.stringify(selectedFilters));
      formData.append("params", JSON.stringify(filterParams));

      // Upload file
      setProgress(20);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const { fileId, filePath } = await uploadRes.json();

      // Create task
      setProgress(40);
      const taskRes = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "video-filter",
          inputFile: filePath,
          params: {
            filters: selectedFilters,
            filterParams,
          },
        }),
      });
      const { taskId } = await taskRes.json();

      // Poll for completion
      let status = "PENDING";
      while (status !== "COMPLETED" && status !== "FAILED") {
        await new Promise((r) => setTimeout(r, 1000));
        const statusRes = await fetch(`/api/task/${taskId}`);
        const statusData = await statusRes.json();
        status = statusData.status;
        setProgress(40 + statusData.progress * 0.5);
      }

      if (status === "COMPLETED") {
        setResultUrl(`/api/download/${taskId}`);
        setProgress(100);
      }
    } catch (error) {
      console.error("Processing error:", error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">视频滤镜</h1>
          <p className="text-gray-400">为您的视频添加专业级滤镜效果</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Video Preview */}
          <Card className="bg-[#16213e] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">视频预览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                {preview ? (
                  <video
                    ref={videoRef}
                    src={preview}
                    className="w-full h-full object-contain"
                    controls
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <label className="cursor-pointer text-center p-8">
                      <div className="text-6xl mb-4">🎬</div>
                      <div>点击上传视频</div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {file && (
                <div className="text-sm text-gray-400">
                  <p>文件: {file.name}</p>
                  <p>大小: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}

              {processing && (
                <div className="mt-4">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-gray-400 mt-2 text-center">
                    处理中... {Math.round(progress)}%
                  </p>
                </div>
              )}

              {resultUrl && (
                <div className="mt-4">
                  <a
                    href={resultUrl}
                    download
                    className="inline-block w-full text-center bg-green-600 hover:bg-green-700 text-white py-2 rounded"
                  >
                    下载处理后的视频
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="bg-[#16213e] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">选择滤镜</CardTitle>
              <CardDescription className="text-gray-400">
                点击选择一个或多个滤镜
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {videoFilters.map((filter) => (
                  <button
                    key={filter.name}
                    onClick={() => toggleFilter(filter.name)}
                    className={`p-3 rounded text-sm transition-colors ${
                      selectedFilters.includes(filter.name)
                        ? "bg-purple-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Filter Parameters */}
              {selectedFilters.length > 0 && (
                <div className="space-y-4 mb-6">
                  <h3 className="text-sm font-medium text-gray-400">滤镜参数</h3>
                  {selectedFilters.map((filterName) => {
                    const filter = videoFilters.find((f) => f.name === filterName);
                    if (!filter?.params) return null;

                    return (
                      <div key={filterName} className="space-y-2">
                        <p className="text-sm text-white">{filter.label}</p>
                        {Object.entries(filter.params).map(([paramName, param]) => (
                          <div key={paramName} className="flex items-center gap-4">
                            <span className="text-xs text-gray-400 w-16">{paramName}</span>
                            <Slider
                              value={[filterParams[filterName]?.[paramName] ?? param.default]}
                              min={param.min}
                              max={param.max}
                              step={0.1}
                              onValueChange={(v) => updateFilterParam(filterName, paramName, v[0])}
                              className="flex-1"
                            />
                            <span className="text-xs text-white w-12">
                              {(filterParams[filterName]?.[paramName] ?? param.default).toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                onClick={handleProcess}
                disabled={!file || selectedFilters.length === 0 || processing}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {processing ? "处理中..." : "应用滤镜"}
              </Button>

              {selectedFilters.length > 0 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  已选择 {selectedFilters.length} 个滤镜
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filter Descriptions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">滤镜说明</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {videoFilters.map((filter) => (
              <div
                key={filter.name}
                className="bg-[#16213e] p-4 rounded-lg border border-gray-700"
              >
                <h3 className="font-medium text-white mb-1">{filter.label}</h3>
                <p className="text-sm text-gray-400">{filter.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
