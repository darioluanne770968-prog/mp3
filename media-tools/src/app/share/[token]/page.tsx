"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ShareInfo {
  file: {
    name: string;
    size: number;
    mimeType: string;
    duration?: number;
  };
  share: {
    downloads: number;
    maxDownloads?: number;
    expiresAt?: string;
  };
}

export default function SharePage({ params }: { params: { token: string } }) {
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [password, setPassword] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchShareInfo();
  }, [params.token]);

  const fetchShareInfo = async () => {
    try {
      const res = await fetch(`/api/share/${params.token}`);
      const data = await res.json();

      if (data.requirePassword) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setShareInfo(data);
      setLoading(false);
    } catch (err) {
      setError("获取分享信息失败");
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    try {
      const res = await fetch(`/api/share/${params.token}?password=${encodeURIComponent(password)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setShareInfo(data);
      setRequiresPassword(false);
      setError("");
    } catch (err) {
      setError("验证密码失败");
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/share/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        setDownloading(false);
        return;
      }

      // Get filename from Content-Disposition header
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "download";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) {
          filename = decodeURIComponent(match[1]);
        }
      }

      // Download file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Refresh share info to update download count
      fetchShareInfo();
    } catch (err) {
      setError("下载失败");
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#16213e] border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">文件分享</CardTitle>
          <CardDescription className="text-gray-400">
            有人与您分享了一个文件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-900/50 text-red-400 p-3 rounded text-sm">
              {error}
            </div>
          )}

          {requiresPassword && !shareInfo && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm text-center">
                此分享需要密码才能访问
              </p>
              <Input
                type="password"
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#1a1a2e] border-gray-600 text-white"
              />
              <Button
                onClick={handleUnlock}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                验证密码
              </Button>
            </div>
          )}

          {shareInfo && (
            <div className="space-y-4">
              <div className="bg-[#1a1a2e] p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">
                    {shareInfo.file.mimeType.startsWith("audio/") && "🎵"}
                    {shareInfo.file.mimeType.startsWith("video/") && "🎬"}
                    {shareInfo.file.mimeType.startsWith("image/") && "🖼️"}
                    {shareInfo.file.mimeType === "application/pdf" && "📄"}
                    {!shareInfo.file.mimeType.match(/^(audio|video|image)\//) &&
                      shareInfo.file.mimeType !== "application/pdf" &&
                      "📁"}
                  </span>
                  <div>
                    <p className="text-white font-medium truncate max-w-[250px]">
                      {shareInfo.file.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      {formatFileSize(shareInfo.file.size)}
                      {shareInfo.file.duration &&
                        ` · ${formatDuration(shareInfo.file.duration)}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-400 space-y-1">
                {shareInfo.share.maxDownloads && (
                  <p>
                    下载次数: {shareInfo.share.downloads} /{" "}
                    {shareInfo.share.maxDownloads}
                  </p>
                )}
                {shareInfo.share.expiresAt && (
                  <p>
                    过期时间:{" "}
                    {new Date(shareInfo.share.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>

              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {downloading ? "下载中..." : "下载文件"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
