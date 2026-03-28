-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "planStarted" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#FF4136',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "shape" TEXT NOT NULL DEFAULT 'PILL',
    "position" TEXT NOT NULL DEFAULT 'TOP_LEFT',
    "autoDiscount" BOOLEAN NOT NULL DEFAULT false,
    "stockThreshold" INTEGER DEFAULT 5,
    "targetType" TEXT NOT NULL DEFAULT 'ALL',
    "targetIds" TEXT,
    "syncedTargetIds" TEXT,
    "size" INTEGER NOT NULL DEFAULT 12,
    "edgeStyle" TEXT NOT NULL DEFAULT 'SMOOTH',
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "gradientEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gradientColorEnd" TEXT,
    "gradientDirection" TEXT NOT NULL DEFAULT 'to right',
    "hoverOnly" BOOLEAN NOT NULL DEFAULT false,
    "hoverDuration" INTEGER NOT NULL DEFAULT 300,
    "scrollingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scrollSpeed" INTEGER NOT NULL DEFAULT 20,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopDomain_key" ON "Shop"("shopDomain");

-- CreateIndex
CREATE INDEX "Badge_shopId_idx" ON "Badge"("shopId");

-- CreateIndex
CREATE INDEX "Badge_shopId_active_priority_idx" ON "Badge"("shopId", "active", "priority");

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
