export const APP_ENVS = ["local", "production", "test"] as const;

export type AppEnv = (typeof APP_ENVS)[number];

export function resolveAppEnv(env: NodeJS.ProcessEnv): AppEnv {
  const explicit = env.APP_ENV?.trim();
  if (explicit === "local" || explicit === "production" || explicit === "test") {
    return explicit;
  }
  if (env.NODE_ENV === "test") {
    return "test";
  }
  if (env.NODE_ENV === "production") {
    return "production";
  }
  return "local";
}

export function loadDotenvFile(appEnv: AppEnv): boolean {
  return appEnv === "local";
}
