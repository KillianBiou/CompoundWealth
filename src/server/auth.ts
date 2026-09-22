import { hash, verify } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { getSession } from "./session";

const ARGON_OPTS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTS);
}

export async function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  return verify(hashValue, password);
}

export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.userId;
}
