import { expect, test } from "vitest";
import { contentTypeFor, extensionOf, formatBytes, isOriginalName, safeFilename } from "@/lib/files";
import { assertSafeKey, fileUrl, makeLocalKey } from "@/lib/storage";

test("extensionOf lower-cases and handles missing dots", () => {
  expect(extensionOf("원고.HWPX")).toBe("hwpx");
  expect(extensionOf("noext")).toBe("");
  expect(isOriginalName("a.docx")).toBe(true);
  expect(isOriginalName("a.txt")).toBe(false);
});

test("safeFilename strips paths and control characters, keeps Korean", () => {
  expect(safeFilename("../../etc/passwd")).toBe("passwd");
  expect(safeFilename("C:\\문서\\1단원 원고.hwp")).toBe("1단원 원고.hwp");
  expect(safeFilename("a\u0000b\n.pdf")).toBe("ab.pdf");
  expect(safeFilename(".hidden")).toBe("hidden");
  expect(safeFilename("   ")).toBe("file");
  expect(safeFilename("x".repeat(200) + ".pdf").length).toBe(150);
});

test("local keys are part/stamp/filename and reject traversal", () => {
  const key = makeLocalKey("part1", "원고.hwp");
  expect(key.startsWith("part1/")).toBe(true);
  expect(key.endsWith("/원고.hwp")).toBe(true);
  expect(() => assertSafeKey("a/../b")).toThrow("잘못된 파일 키");
  expect(() => assertSafeKey("a//b")).toThrow("잘못된 파일 키");
  expect(() => assertSafeKey("single")).toThrow("잘못된 파일 키");
});

test("fileUrl maps local refs to the files route and adds download flags", () => {
  expect(fileUrl("local:p/s/원고 1.pdf")).toBe("/api/files/p/s/%EC%9B%90%EA%B3%A0%201.pdf");
  expect(fileUrl("local:p/s/a.pdf", { download: true })).toBe("/api/files/p/s/a.pdf?download=1");
  expect(fileUrl("https://x.public.blob.vercel-storage.com/a.pdf")).toBe("https://x.public.blob.vercel-storage.com/a.pdf");
  expect(fileUrl("https://x.public.blob.vercel-storage.com/a.pdf", { download: true })).toBe(
    "/api/download?ref=https%3A%2F%2Fx.public.blob.vercel-storage.com%2Fa.pdf",
  );
});

test("contentTypeFor and formatBytes", () => {
  expect(contentTypeFor("a.pdf")).toBe("application/pdf");
  expect(contentTypeFor("a.bin")).toBe("application/octet-stream");
  expect(formatBytes(500 * 1024)).toBe("500KB");
  expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5MB");
  expect(formatBytes(20 * 1024 * 1024)).toBe("20MB");
});
