import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(512)
});

export const terminalCreateSchema = z.object({
  id: z.string().min(1).max(128),
  shell: z.string().min(1).max(256).optional().nullable(),
  cwd: z.string().min(1).max(4096).optional().nullable(),
  cols: z.number().int().min(2).max(500),
  rows: z.number().int().min(2).max(300),
  initialCommand: z.string().max(8192).optional().nullable()
});

export const fsListSchema = z.object({
  path: z.string().min(1).max(4096)
});

export const fsReadSchema = z.object({
  path: z.string().min(1).max(4096),
  maxBytes: z.number().int().min(1).max(10_000_000).optional().nullable()
});

export const fsWriteSchema = z.object({
  path: z.string().min(1).max(4096),
  contents: z.string().max(10_000_000)
});

export const skillSaveSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000),
  category: z.string().min(1).max(80),
  body: z.string().min(1).max(250_000),
  existingOrigin: z.string().max(4096).optional().nullable(),
  targetDir: z.string().max(4096).optional().nullable()
});

export const workspaceUpsertSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(160),
  color: z.string().min(1).max(40),
  cwd: z.string().min(1).max(4096),
  mode: z.enum(["orbit", "hive"]),
  stateJson: z.string().max(2_000_000)
});
