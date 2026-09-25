import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const bookingSchema = z.object({
  venueId: z.string().uuid(),
  slotDate: z.string(), // YYYY-MM-DD
  slotStart: z.string(), // HH:MM
  slotEnd: z.string(), // HH:MM
  playerCount: z.number().int().min(1),
});

export const registerTournamentSchema = z.object({
  teamName: z.string().min(2).max(120),
});

export const postSquadRequestSchema = z.object({
  kind: z.literal("squad"),
  venueId: z.string().uuid(),
  sportType: z.string().min(2).max(30),
  slotDate: z.string(),
  slotStart: z.string(),
  totalCost: z.number().positive(),
  slotsTotal: z.number().int().min(1).max(50),
});

export const postSoloAvailabilitySchema = z.object({
  kind: z.literal("solo"),
  sportType: z.string().min(2).max(30),
  availableDate: z.string(),
  availableTime: z.string(),
  maxBudget: z.number().positive().optional(),
  notes: z.string().max(280).optional(),
});

export const postMatchmakingSchema = z.discriminatedUnion("kind", [
  postSquadRequestSchema,
  postSoloAvailabilitySchema,
]);

export const redeemCodeSchema = z.object({
  code: z.string().min(1).max(40),
});

export const redeemVoucherSchema = z.object({
  voucherId: z.string().uuid(),
});
