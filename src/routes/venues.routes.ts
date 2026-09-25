import { Router } from "express";
import { getVenue, getVenues, postVenueImage } from "../controllers/venues.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { singleImageUpload } from "../middleware/upload.middleware";
import { asyncHandler } from "../utils/asyncHandler";

export const venuesRouter = Router();

venuesRouter.get("/", asyncHandler(getVenues));
venuesRouter.get("/:id", asyncHandler(getVenue));
venuesRouter.post("/:id/images", requireAuth, singleImageUpload, asyncHandler(postVenueImage));
