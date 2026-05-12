import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { db, now } from "../db.js";
import { safeResolve } from "./files.js";
import type { DiscoveredSkill, SaveSkillFileInput, SkillRoot } from "../../../shared/types.js";

export function defaultSkillDir() {
  return path.join(config.dataDir, "skills");
}

function slug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function parseSkillFile(file: string, body: string, source = "file"): DiscoveredSkill {
  const name = path.basename(path.dirname(file)) || path.basename(file, ".md");
  const title = body.match(/^name:\s*(.+)$/m)?.[1]?.trim() || name;
  const description = body.match(/^description:\s*(.+)$/m)?.[1]?.trim() || "";
  return {
    source,
    origin: file,
    name: title,
    description,
    body,
    category: "GENERAL"
  };
}

export async function listRoots(): Promise<SkillRoot[]> {
  const dir = defaultSkillDir();
  await fs.mkdir(dir, { recursive: true });
  return [{ source: "mesh-server", path: dir, exists: true }];
}

export async function listDbSkills(): Promise<DiscoveredSkill[]> {
  const rows = db.prepare("SELECT * FROM skills ORDER BY updated_at DESC").all() as Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    body: string;
    source: string;
    origin: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    origin: r.origin,
    name: r.name,
    description: r.description,
    body: r.body,
    category: r.category
  }));
}

async function discoverRaw(dir: string): Promise<DiscoveredSkill[]> {
  const found: DiscoveredSkill[] = [];
  async function walk(current: string, depth: number) {
    if (depth > 4) return;
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else if (entry.name.toLowerCase() === "skill.md" || entry.name.endsWith(".md")) {
        const body = await fs.readFile(full, "utf8").catch(() => "");
        if (body) found.push(parseSkillFile(full, body));
      }
    }
  }
  await walk(dir, 0);
  return found;
}

export async function discoverIn(dirInput: string): Promise<DiscoveredSkill[]> {
  return discoverRaw(safeResolve(dirInput));
}

export async function discover(): Promise<DiscoveredSkill[]> {
  const fromDb = await listDbSkills();
  const dir = defaultSkillDir();
  await fs.mkdir(dir, { recursive: true });
  const fromFiles = await discoverRaw(dir);
  return [...fromDb, ...fromFiles];
}

export async function saveSkill(input: SaveSkillFileInput): Promise<string> {
  const id = randomUUID();
  const dir = input.targetDir ? safeResolve(input.targetDir) : defaultSkillDir();
  await fs.mkdir(dir, { recursive: true });
  const skillDir = path.join(dir, slug(input.name) || id);
  await fs.mkdir(skillDir, { recursive: true });
  const file = input.existingOrigin || path.join(skillDir, "SKILL.md");
  await fs.writeFile(file, input.body, "utf8");
  db.prepare(
    `INSERT INTO skills (id, name, description, category, body, source, origin, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name,
       description=excluded.description,
       category=excluded.category,
       body=excluded.body,
       origin=excluded.origin,
       updated_at=excluded.updated_at`
  ).run(id, input.name, input.description, input.category, input.body, "user", file, now(), now());
  return file;
}

export async function deleteSkill(file: string): Promise<void> {
  const target = safeResolve(file);
  await fs.rm(target, { force: true });
  db.prepare("DELETE FROM skills WHERE origin = ?").run(target);
}
