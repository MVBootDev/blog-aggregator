import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

function getConfigFilePath(): string {
  return process.env.GATOR_CONFIG_PATH || path.join(os.homedir(), ".gatorconfig.json");
}

function writeConfig(cfg: Config): void {
  const rawConfig = {
    db_url: cfg.dbUrl,
    ...(cfg.currentUserName ? { current_user_name: cfg.currentUserName } : {}),
  };
  fs.writeFileSync(getConfigFilePath(), JSON.stringify(rawConfig, null, 2));
}

function validateConfig(rawConfig: unknown): Config {
  if (typeof rawConfig !== "object" || rawConfig === null) {
    throw new Error("Invalid config: expected an object");
  }
  const config = rawConfig as Record<string, unknown>;
  if (typeof config.db_url !== "string") {
    throw new Error("Invalid config: db_url must be a string");
  }
  if (config.current_user_name !== undefined && typeof config.current_user_name !== "string") {
    throw new Error("Invalid config: current_user_name must be a string");
  }
  return {
    dbUrl: config.db_url,
    ...(typeof config.current_user_name === "string"
      ? { currentUserName: config.current_user_name }
      : {}),
  };
}

export function readConfig(): Config {
  return validateConfig(JSON.parse(fs.readFileSync(getConfigFilePath(), "utf8")));
}

export function setUser(userName: string): void {
  writeConfig({ ...readConfig(), currentUserName: userName });
}

export function setDbUrl(dbUrl: string): void {
  writeConfig({ ...readConfig(), dbUrl });
}
