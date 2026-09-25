import type { Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler";
import { listTournaments, registerTeam } from "../services/tournament.service";
import { registerTournamentSchema } from "../utils/validators";

export async function getTournaments(_req: Request, res: Response): Promise<void> {
  const tournaments = await listTournaments();
  res.json({ tournaments });
}

export async function postRegister(req: Request, res: Response): Promise<void> {
  const parsed = registerTournamentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid registration details");
  }

  const tournament = await registerTeam(req.params.id, req.user!.id, parsed.data.teamName);
  res.status(201).json({ tournament });
}
