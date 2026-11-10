import { readConfig, setUser } from "../config.js";
import { createUser, deleteAllUsers, getUser, getUsers } from "../lib/db/queries/users.js";

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export async function handlerLogin(_cmdName: string, ...args: string[]): Promise<void> {
  const [name] = args;
  if (!name) throw new Error("The login command requires a username");

  const user = await getUser(name);
  if (!user) throw new Error(`User ${name} does not exist`);

  setUser(user.name);
  console.log(`Logged in as ${user.name}`);
}

export async function handlerRegister(_cmdName: string, ...args: string[]): Promise<void> {
  const [name] = args;
  if (!name) throw new Error("The register command requires a username");

  const user = await createUser(name);
  setUser(user.name);
  console.log(`User ${user.name} created successfully`);
}

export async function handlerReset(_cmdName: string): Promise<void> {
  await deleteAllUsers();
  console.log("Database reset successfully");
}

export async function handlerUsers(_cmdName: string): Promise<void> {
  const config = readConfig();
  const users = await getUsers();
  for (const user of users) {
    const current = user.name === config.currentUserName ? " (current)" : "";
    console.log(`* ${user.name}${current}`);
  }
}
