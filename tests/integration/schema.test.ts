import { expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";

test("part order is unique within a book", async () => {
  await resetDb();
  const book = await prisma.book.create({ data: { title: "종교 1" } });
  await prisma.part.create({ data: { bookId: book.id, order: 1, title: "1단원" } });
  await expect(
    prisma.part.create({ data: { bookId: book.id, order: 1, title: "중복" } }),
  ).rejects.toMatchObject({ code: "P2002" });
});

test("same order in a different book, or a different order in the same book, is allowed", async () => {
  await resetDb();
  const a = await prisma.book.create({ data: { title: "종교 1" } });
  const b = await prisma.book.create({ data: { title: "종교 2" } });
  await prisma.part.create({ data: { bookId: a.id, order: 1, title: "A-1" } });
  await expect(
    prisma.part.create({ data: { bookId: b.id, order: 1, title: "B-1" } }),
  ).resolves.toBeDefined();
  await expect(
    prisma.part.create({ data: { bookId: a.id, order: 2, title: "A-2" } }),
  ).resolves.toBeDefined();
});
