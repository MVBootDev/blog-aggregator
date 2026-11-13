import { Context, Effect, Layer } from "effect";
import { readConfig, setUser, type Config } from "./config.js";

export class ConfigError extends Error {
  readonly _tag = "ConfigError";
  constructor(cause: unknown) {
    super(`Configuration error: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}

type ConfigStore = {
  readonly read: Effect.Effect<Config, ConfigError>;
  readonly setUser: (name: string) => Effect.Effect<void, ConfigError>;
};

export class AppConfig extends Context.Service<AppConfig, ConfigStore>()("gator/Config") {}

export const AppConfigLive = Layer.succeed(AppConfig, {
  read: Effect.try({ try: readConfig, catch: (error) => new ConfigError(error) }),
  setUser: (name) => Effect.try({ try: () => setUser(name), catch: (error) => new ConfigError(error) }),
});
