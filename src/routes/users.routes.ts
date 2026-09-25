import { Router } from "express";
import { getProfile, postAvatar } from "../controllers/users.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { singleImageUpload } from "../middleware/upload.middleware";
import { asyncHandler } from "../utils/asyncHandler";

export const usersRouter = Router();

usersRouter.get("/profile", requireAuth, asyncHandler(getProfile));
usersRouter.post("/avatar", requireAuth, singleImageUpload, asyncHandler(postAvatar));
