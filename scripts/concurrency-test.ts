import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tokenA = process.env.CLAIM_TOKEN_A;
const tokenB = process.env.CLAIM_TOKEN_B;

if (!url || !key || !tokenA || !tokenB) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAIM_TOKEN_A and CLAIM_TOKEN_B. " +
    "Both tokens must be unused and belong to the same open shift."
  );
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function claim(token: string) {
  const { data, error } = await db.rpc("claim_shift", { p_token: token });
  if (error) throw error;
  return data as { status?: string; shift_id?: string };
}

const [first, second] = await Promise.all([claim(tokenA), claim(tokenB)]);
const results = [first, second];
const winners = results.filter((result) => result.status === "claimed");

console.log(JSON.stringify(results, null, 2));

if (winners.length !== 1) {
  throw new Error(`Expected exactly one successful claim, received ${winners.length}.`);
}

if (first.shift_id && second.shift_id && first.shift_id !== second.shift_id) {
  throw new Error("The supplied tokens did not refer to the same shift.");
}

console.log("Concurrency invariant verified: exactly one volunteer claimed the shift.");
