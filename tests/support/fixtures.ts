import { readFileSync } from "node:fs";

export function loadFixture<T>(relativePath: string): T {
  const fileUrl = new URL(`../fixtures/${relativePath}`, import.meta.url);
  return JSON.parse(readFileSync(fileUrl, "utf8")) as T;
}
