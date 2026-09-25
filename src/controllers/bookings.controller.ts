import type { Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler";
import { createBooking } from "../services/booking.service";
import { bookingSchema } from "../utils/validators";

export async function postBooking(req: Request, res: Response): Promise<void> {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid booking details");
  }

  const booking = await createBooking({
    userId: req.user!.id,
    venueId: parsed.data.venueId,
    slotDate: parsed.data.slotDate,
    slotStart: parsed.data.slotStart,
    slotEnd: parsed.data.slotEnd,
    playerCount: parsed.data.playerCount,
  });

  res.status(201).json({ booking });
}
