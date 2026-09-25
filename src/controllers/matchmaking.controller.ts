import type { Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler";
import {
  joinSquad,
  listSolo,
  listSquads,
  postSoloAvailability,
  postSquadRequest,
} from "../services/matchmaking.service";
import { broadcast } from "../sockets";
import { postMatchmakingSchema } from "../utils/validators";

export async function getSquads(_req: Request, res: Response): Promise<void> {
  const squads = await listSquads();
  res.json({ squads });
}

export async function getSolo(_req: Request, res: Response): Promise<void> {
  const solo = await listSolo();
  res.json({ solo });
}

export async function postMatch(req: Request, res: Response): Promise<void> {
  const parsed = postMatchmakingSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid matchmaking post");
  }

  if (parsed.data.kind === "squad") {
    const squad = await postSquadRequest({
      captainId: req.user!.id,
      venueId: parsed.data.venueId,
      sportType: parsed.data.sportType,
      slotDate: parsed.data.slotDate,
      slotStart: parsed.data.slotStart,
      totalCost: parsed.data.totalCost,
      slotsTotal: parsed.data.slotsTotal,
    });
    broadcast("matchmaking:squad:new", squad);
    res.status(201).json({ squad });
    return;
  }

  const solo = await postSoloAvailability({
    userId: req.user!.id,
    sportType: parsed.data.sportType,
    availableDate: parsed.data.availableDate,
    availableTime: parsed.data.availableTime,
    maxBudget: parsed.data.maxBudget,
    notes: parsed.data.notes,
  });
  broadcast("matchmaking:solo:new", solo);
  res.status(201).json({ solo });
}

export async function postJoin(req: Request, res: Response): Promise<void> {
  const squad = await joinSquad(req.params.squadId, req.user!.id);
  broadcast("matchmaking:squad:updated", squad);
  res.status(200).json({ squad });
}
