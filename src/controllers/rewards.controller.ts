import type { Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler";
import { getWallet, listVouchers, redeemCode, redeemVoucher } from "../services/rewards.service";
import { broadcast } from "../sockets";
import { redeemCodeSchema, redeemVoucherSchema } from "../utils/validators";

export async function getWalletHandler(req: Request, res: Response): Promise<void> {
  const wallet = await getWallet(req.user!.id);
  res.json(wallet);
}

export async function getVouchersHandler(_req: Request, res: Response): Promise<void> {
  const vouchers = await listVouchers();
  res.json({ vouchers });
}

export async function postRedeemCode(req: Request, res: Response): Promise<void> {
  const parsed = redeemCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "A coupon code is required");
  }

  const result = await redeemCode(req.user!.id, parsed.data.code);
  broadcast("rewards:wallet:updated", { userId: req.user!.id, balance: result.balance });
  res.status(200).json(result);
}

export async function postRedeemVoucher(req: Request, res: Response): Promise<void> {
  const parsed = redeemVoucherSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "A voucher is required");
  }

  const result = await redeemVoucher(req.user!.id, parsed.data.voucherId);
  broadcast("rewards:wallet:updated", { userId: req.user!.id, balance: result.balance });
  res.status(200).json(result);
}
