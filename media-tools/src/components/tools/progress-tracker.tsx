"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle, XCircle } from "lucide-react";

interface ProgressTrackerProps {
  taskId: string;
  onComplete?: (outputFile: string) => void;
  onError?: (error: string) => void;
}

export function ProgressTracker({
  taskId,
  onComplete,
  onError,
}: ProgressTrackerProps) {
  const [status, setStatus] = useState<string>("PENDING");
  const [progress, setProgress] = useState(0);
  const [outputFile, setOutputFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/task/${taskId}`);
        const data = await response.json();

        setStatus(data.status);
        setProgress(data.progress || 0);

        if (data.status === "COMPLETED") {
          setOutputFile(data.outputFile);
          onComplete?.(data.outputFile);
        } else if (data.status === "FAILED") {
          setError(data.error || "Processing failed");
          onError?.(data.error || "Processing failed");
        }
      } catch (e) {
        console.error("Failed to poll status:", e);
      }
    };

    if (status !== "COMPLETED" && status !== "FAILED") {
      const interval = setInterval(pollStatus, 1000);
      pollStatus();
      return () => clearInterval(interval);
    }
  }, [taskId, status, onComplete, onError]);

  const handleDownload = () => {
    if (outputFile) {
      const fileId = outputFile.split("/").pop()?.replace(/\.[^.]+$/, "");
      if (fileId) {
        window.open(`/api/download/${fileId}`, "_blank");
      }
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-4 mb-4">
        {status === "PENDING" && (
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        )}
        {status === "PROCESSING" && (
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        )}
        {status === "COMPLETED" && (
          <CheckCircle className="h-6 w-6 text-green-500" />
        )}
        {status === "FAILED" && (
          <XCircle className="h-6 w-6 text-destructive" />
        )}

        <div className="flex-1">
          <p className="font-medium">
            {status === "PENDING" && "Waiting to process..."}
            {status === "PROCESSING" && "Processing your file..."}
            {status === "COMPLETED" && "Processing complete!"}
            {status === "FAILED" && "Processing failed"}
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>

      {(status === "PENDING" || status === "PROCESSING") && (
        <Progress value={progress} className="mb-4" />
      )}

      {status === "COMPLETED" && (
        <Button onClick={handleDownload} className="w-full gap-2">
          <Download className="h-4 w-4" />
          Download Result
        </Button>
      )}
    </div>
  );
}
