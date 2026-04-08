-- CreateTable
CREATE TABLE "Popup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "headerTitle" TEXT NOT NULL,
    "headerTitleColor" TEXT NOT NULL,
    "headerShowClose" BOOLEAN NOT NULL DEFAULT true,
    "bodyText" TEXT NOT NULL,
    "bodyBackgroundColor" TEXT NOT NULL,
    "bodyTextColor" TEXT NOT NULL,
    "bodyActionLabel" TEXT,
    "bodyActionUrl" TEXT,
    "footerText" TEXT NOT NULL,
    "footerTextColor" TEXT NOT NULL,
    "frequencyMaxPerDayPerBrowser" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Popup_shop_hook_isActive_idx" ON "Popup"("shop", "hook", "isActive");

-- CreateIndex
CREATE INDEX "Popup_shop_hook_priority_updatedAt_idx" ON "Popup"("shop", "hook", "priority", "updatedAt");
