"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface TaskProgress {
  taskId: string;
  progress: number;
}

interface TaskResult {
  taskId: string;
  result?: {
    success: boolean;
    outputFile?: string;
    error?: string;
  };
  error?: string;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket disconnected");
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribeToTask = useCallback((taskId: string) => {
    socketRef.current?.emit("subscribe", taskId);
  }, []);

  const unsubscribeFromTask = useCallback((taskId: string) => {
    socketRef.current?.emit("unsubscribe", taskId);
  }, []);

  const onProgress = useCallback(
    (callback: (data: TaskProgress) => void) => {
      socketRef.current?.on("progress", callback);
      return () => {
        socketRef.current?.off("progress", callback);
      };
    },
    []
  );

  const onCompleted = useCallback(
    (callback: (data: TaskResult) => void) => {
      socketRef.current?.on("completed", callback);
      return () => {
        socketRef.current?.off("completed", callback);
      };
    },
    []
  );

  const onFailed = useCallback(
    (callback: (data: TaskResult) => void) => {
      socketRef.current?.on("failed", callback);
      return () => {
        socketRef.current?.off("failed", callback);
      };
    },
    []
  );

  return {
    isConnected,
    subscribeToTask,
    unsubscribeFromTask,
    onProgress,
    onCompleted,
    onFailed,
  };
}

export function useTaskProgress(taskId: string | null) {
  const [status, setStatus] = useState<"pending" | "processing" | "completed" | "failed">("pending");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TaskResult["result"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { subscribeToTask, unsubscribeFromTask, onProgress, onCompleted, onFailed } = useSocket();

  useEffect(() => {
    if (!taskId) return;

    subscribeToTask(taskId);

    const unsubProgress = onProgress((data) => {
      if (data.taskId === taskId) {
        setProgress(data.progress);
        setStatus("processing");
      }
    });

    const unsubCompleted = onCompleted((data) => {
      if (data.taskId === taskId) {
        setStatus("completed");
        setProgress(100);
        setResult(data.result);
      }
    });

    const unsubFailed = onFailed((data) => {
      if (data.taskId === taskId) {
        setStatus("failed");
        setError(data.error || "Processing failed");
      }
    });

    return () => {
      unsubscribeFromTask(taskId);
      unsubProgress();
      unsubCompleted();
      unsubFailed();
    };
  }, [taskId, subscribeToTask, unsubscribeFromTask, onProgress, onCompleted, onFailed]);

  return { status, progress, result, error };
}
