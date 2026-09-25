import { Router } from "express";
import { getTournaments, postRegister } from "../controllers/tournaments.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

export const tournamentsRouter = Router();

tournamentsRouter.get("/", asyncHandler(getTournaments));
tournamentsRouter.post("/:id/register", requireAuth, asyncHandler(postRegister));
