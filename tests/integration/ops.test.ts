import { expect, test } from "vitest";
import { createUser } from "@/lib/users";
import { createBook } from "@/lib/books";
import { createPart } from "@/lib/parts";
import { createVersion } from "@/lib/versions";
import { createFileMaterial } from "@/lib/materials";
import { backupJson, buildBackup, opsSummary } from "@/lib/ops";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";

test("opsSummary counts and backup includes tables and file list", async () => {
  await resetDb();
  await prisma.appSetting.deleteMany();
  const e = await createUser({ loginId: "e1", name: "편집장", password: "temp-pass-1" });
  const b = await createBook({ title: "책", editorUserId: e.id });
  const p = await createPart({ bookId: b.id, title: "1장", assigneeUserId: e.id });
  await createVersion({ partId: p.id, uploadedById: e.id, originalRef: "local:p/a/1.hwp", originalName: "1.hwp", originalSize: 100, pdfRef: "local:p/a/1.pdf", pdfName: "1.pdf" });
  await createFileMaterial(e, { partId: p.id, ref: "local:p/m/s.jpg", name: "s.jpg", size: 50 });
  const before = await opsSummary();
  expect(before.counts).toMatchObject({ users: 1, books: 1, parts: 1, versions: 1, materials: 1 });
  expect(before.bytes).toEqual({ originals: 100, materials: 50 });
  expect(before.lastBackupAt).toBeNull();
  const backup = await buildBackup();
  expect(backup.files.map((f) => f.kind)).toEqual(["원고", "미리보기", "자료"]);
  const json = JSON.parse(backupJson(backup));
  expect(json.tables.materials[0].size).toBe(50);
  expect(json.tables.users[0].passwordHash).toMatch(/^\$2/);
  expect((await opsSummary()).daysSinceBackup).toBe(0);
});
