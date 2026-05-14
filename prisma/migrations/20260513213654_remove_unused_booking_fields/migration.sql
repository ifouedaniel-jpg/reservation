/*
  Warnings:

  - You are about to drop the column `customerEmail` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `customerInstagram` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `customerLastName` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `preferredChannel` on the `Booking` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicCode" TEXT NOT NULL,
    "customerFirstName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "notes" TEXT,
    "selectedOptions" TEXT,
    "serviceId" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "bookingStartsAt" DATETIME NOT NULL,
    "bookingEndsAt" DATETIME NOT NULL,
    "priceCentsAtBooking" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "cancellationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    "cancelledAt" DATETIME,
    CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("bookingEndsAt", "bookingStartsAt", "cancellationReason", "cancelledAt", "confirmedAt", "createdAt", "customerFirstName", "customerPhone", "id", "notes", "priceCentsAtBooking", "publicCode", "selectedOptions", "serviceId", "status", "timeSlotId", "updatedAt") SELECT "bookingEndsAt", "bookingStartsAt", "cancellationReason", "cancelledAt", "confirmedAt", "createdAt", "customerFirstName", "customerPhone", "id", "notes", "priceCentsAtBooking", "publicCode", "selectedOptions", "serviceId", "status", "timeSlotId", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_publicCode_key" ON "Booking"("publicCode");
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");
CREATE INDEX "Booking_timeSlotId_idx" ON "Booking"("timeSlotId");
CREATE INDEX "Booking_bookingStartsAt_idx" ON "Booking"("bookingStartsAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
