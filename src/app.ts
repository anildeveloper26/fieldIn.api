import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimit } from "./middleware/rateLimit.middleware";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { venuesRouter } from "./routes/venues.routes";
import { bookingsRouter } from "./routes/bookings.routes";
import { tournamentsRouter } from "./routes/tournaments.routes";
import { matchmakingRouter } from "./routes/matchmaking.routes";
import { rewardsRouter } from "./routes/rewards.routes";

export const app = express();

app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(express.json());

// Requests arrive browser -> Vercel (Next.js /api proxy) -> Render's load
// balancer -> here, so trust two X-Forwarded-For hops; otherwise every user
// would share Vercel's IP and one rate-limit bucket. Override with
// TRUST_PROXY_HOPS if the deployment topology changes.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 2));

// Global ceiling for the whole API, plus a much tighter one on credential
// endpoints to slow down password guessing.
app.use("/api", rateLimit({ name: "api", windowSeconds: 60, max: 300 }));
app.use(["/api/auth/login", "/api/auth/register"], rateLimit({ name: "auth", windowSeconds: 60, max: 10 }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/venues", venuesRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/tournaments", tournamentsRouter);
app.use("/api/matchmaking", matchmakingRouter);
app.use("/api/rewards", rewardsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);
