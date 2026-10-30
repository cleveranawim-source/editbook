import { expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";

test("part order is unique within a book", async () => {
  await resetDb();
  const book = await prisma.book.create({ data: { title: "종교 1" } });
  await prisma.part.create({ data: { bookId: book.id, order: 1, title: "1단원" } });
  await expect(
    prisma.part.create({ data: { bookId: book.id, order: 1, title: "중복" } }),
  ).rejects.toThrow();
});
