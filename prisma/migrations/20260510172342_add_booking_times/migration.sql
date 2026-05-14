/*
  Warnings:

  - Added the required column `bookingEndsAt` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingStartsAt` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicCode" TEXT NOT NULL,
    "customerFirstName" TEXT NOT NULL,
    "customerLastName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerInstagram" TEXT,
    "customerEmail" TEXT,
    "preferredChannel" TEXT NOT NULL,
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
INSERT INTO "new_Booking" ("cancellationReason", "cancelledAt", "confirmedAt", "createdAt", "customerEmail", "customerFirstName", "customerInstagram", "customerLastName", "customerPhone", "id", "notes", "preferredChannel", "priceCentsAtBooking", "publicCode", "selectedOptions", "serviceId", "status", "timeSlotId", "updatedAt") SELECT "cancellationReason", "cancelledAt", "confirmedAt", "createdAt", "customerEmail", "customerFirstName", "customerInstagram", "customerLastName", "customerPhone", "id", "notes", "preferredChannel", "priceCentsAtBooking", "publicCode", "selectedOptions", "serviceId", "status", "timeSlotId", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_publicCode_key" ON "Booking"("publicCode");
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");
CREATE INDEX "Booking_timeSlotId_idx" ON "Booking"("timeSlotId");
CREATE INDEX "Booking_bookingStartsAt_idx" ON "Booking"("bookingStartsAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
