import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { queueEvents } from "./queue";

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("subscribe", (taskId: string) => {
      socket.join(`task:${taskId}`);
      console.log(`Socket ${socket.id} subscribed to task:${taskId}`);
    });

    socket.on("unsubscribe", (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Listen to queue events
  queueEvents.on("progress", ({ jobId, data }) => {
    io?.to(`task:${jobId}`).emit("progress", {
      taskId: jobId,
      progress: data,
    });
  });

  queueEvents.on("completed", ({ jobId, returnvalue }) => {
    io?.to(`task:${jobId}`).emit("completed", {
      taskId: jobId,
      result: returnvalue,
    });
  });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    io?.to(`task:${jobId}`).emit("failed", {
      taskId: jobId,
      error: failedReason,
    });
  });

  return io;
}

export function getSocketServer() {
  return io;
}

export function emitTaskProgress(taskId: string, progress: number) {
  io?.to(`task:${taskId}`).emit("progress", { taskId, progress });
}

export function emitTaskComplete(taskId: string, result: unknown) {
  io?.to(`task:${taskId}`).emit("completed", { taskId, result });
}

export function emitTaskFailed(taskId: string, error: string) {
  io?.to(`task:${taskId}`).emit("failed", { taskId, error });
}
