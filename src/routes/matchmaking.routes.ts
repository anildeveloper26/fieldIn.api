import { Router } from "express";
import { getSolo, getSquads, postJoin, postMatch } from "../controllers/matchmaking.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

export const matchmakingRouter = Router();

matchmakingRouter.get("/squads", asyncHandler(getSquads));
matchmakingRouter.get("/solo", asyncHandler(getSolo));
matchmakingRouter.post("/post", requireAuth, asyncHandler(postMatch));
matchmakingRouter.post("/join/:squadId", requireAuth, asyncHandler(postJoin));
