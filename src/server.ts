import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { connectRedis } from "./config/redis";
import { initSocket } from "./sockets";

async function main(): Promise<void> {
  await connectRedis();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`FieldIn backend listening on port ${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
