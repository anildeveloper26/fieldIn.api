import { Router } from "express";
import { postBooking } from "../controllers/bookings.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

export const bookingsRouter = Router();

bookingsRouter.post("/", requireAuth, asyncHandler(postBooking));
