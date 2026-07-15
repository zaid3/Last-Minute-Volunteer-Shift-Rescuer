function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getSupabaseEnv() {
  return {
    url: required("SUPABASE_URL"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getSessionSecret(): string {
  return required("MANAGER_SESSION_SECRET");
}

export function getEmailEnv() {
  return {
    resendApiKey: required("RESEND_API_KEY"),
    from: required("EMAIL_FROM"),
  };
}
