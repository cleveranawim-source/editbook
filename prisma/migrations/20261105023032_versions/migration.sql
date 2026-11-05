-- CreateTable
CREATE TABLE "Version" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "originalRef" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "pdfRef" TEXT,
    "pdfName" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Version_partId_number_key" ON "Version"("partId", "number");

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
