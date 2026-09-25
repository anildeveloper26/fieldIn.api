import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.frontendOrigin, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      // no-op: no per-connection state to clean up at this scope
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO server accessed before initialization");
  }
  return io;
}

/** Broadcasts are best-effort: if sockets aren't initialized (e.g. in a unit
 * test hitting the service layer directly) we no-op instead of throwing. */
export function broadcast(event: string, payload: unknown): void {
  io?.emit(event, payload);
}
