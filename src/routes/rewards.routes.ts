import { Router } from "express";
import {
  getVouchersHandler,
  getWalletHandler,
  postRedeemCode,
  postRedeemVoucher,
} from "../controllers/rewards.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

export const rewardsRouter = Router();

rewardsRouter.get("/wallet", requireAuth, asyncHandler(getWalletHandler));
rewardsRouter.get("/vouchers", asyncHandler(getVouchersHandler));
rewardsRouter.post("/redeem-code", requireAuth, asyncHandler(postRedeemCode));
rewardsRouter.post("/redeem-voucher", requireAuth, asyncHandler(postRedeemVoucher));
