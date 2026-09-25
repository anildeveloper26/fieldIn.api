import { pool } from "../config/db";
import { ApiError } from "../middleware/errorHandler";

const RVM_CODES: Record<string, number> = {
  "RVM-2026": 25,
};

export async function getWallet(userId: string) {
  const userResult = await pool.query("SELECT coins_balance FROM users WHERE id = $1", [userId]);
  const user = userResult.rows[0];
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const txnResult = await pool.query(
    `SELECT id, amount, type, source, reference_id, created_at
     FROM coin_transactions WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return {
    balance: user.coins_balance,
    transactions: txnResult.rows.map(mapTxnRow),
  };
}

export async function listVouchers() {
  const result = await pool.query(
    `SELECT id, title, description, coin_cost, discount_value, valid_until, is_active
     FROM vouchers WHERE is_active = true ORDER BY coin_cost ASC`
  );
  return result.rows.map(mapVoucherRow);
}

export async function redeemCode(userId: string, code: string) {
  const amount = RVM_CODES[code.trim().toUpperCase()];
  if (!amount) {
    throw new ApiError(400, "Invalid or expired RVM code");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const txnResult = await client.query(
      `INSERT INTO coin_transactions (user_id, amount, type, source) VALUES ($1, $2, 'earned', 'rvm') RETURNING id, amount, type, source, reference_id, created_at`,
      [userId, amount]
    );

    const userResult = await client.query(
      `UPDATE users SET coins_balance = coins_balance + $1 WHERE id = $2 RETURNING coins_balance`,
      [amount, userId]
    );

    await client.query("COMMIT");
    return {
      balance: userResult.rows[0].coins_balance,
      transaction: mapTxnRow(txnResult.rows[0]),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function redeemVoucher(userId: string, voucherId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const voucherResult = await client.query(
      `SELECT id, title, coin_cost, is_active FROM vouchers WHERE id = $1 FOR UPDATE`,
      [voucherId]
    );
    const voucher = voucherResult.rows[0];
    if (!voucher || !voucher.is_active) {
      throw new ApiError(404, "Voucher not found");
    }

    const userResult = await client.query(
      `SELECT coins_balance FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    if (user.coins_balance < voucher.coin_cost) {
      throw new ApiError(400, "Insufficient coins for this voucher");
    }

    const txnResult = await client.query(
      `INSERT INTO coin_transactions (user_id, amount, type, source, reference_id) VALUES ($1, $2, 'spent', 'voucher', $3) RETURNING id, amount, type, source, reference_id, created_at`,
      [userId, voucher.coin_cost, voucherId]
    );

    const updatedUser = await client.query(
      `UPDATE users SET coins_balance = coins_balance - $1 WHERE id = $2 RETURNING coins_balance`,
      [voucher.coin_cost, userId]
    );

    await client.query("COMMIT");
    return {
      balance: updatedUser.rows[0].coins_balance,
      transaction: mapTxnRow(txnResult.rows[0]),
      voucher: { id: voucher.id, title: voucher.title },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function mapTxnRow(row: any) {
  return {
    id: row.id,
    amount: row.amount,
    type: row.type,
    source: row.source,
    referenceId: row.reference_id,
    createdAt: row.created_at,
  };
}

function mapVoucherRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    coinCost: row.coin_cost,
    discountValue: row.discount_value,
    validUntil: row.valid_until,
    isActive: row.is_active,
  };
}
