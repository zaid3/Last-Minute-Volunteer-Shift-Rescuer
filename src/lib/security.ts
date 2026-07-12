export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(req.url).origin;
}

export function hasManagerApiKey(req: Request): boolean {
  const expected = process.env.MANAGER_API_KEY;
  return Boolean(expected && req.headers.get("x-manager-key") === expected);
}
