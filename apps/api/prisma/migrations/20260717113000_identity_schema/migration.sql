-- This migration is additive. Existing User IDs, email, name, and timestamps remain intact.
-- Legacy rows may have a null externalSubject until a verified identity is linked by a later story.
CREATE TYPE "IdentityProvider" AS ENUM ('SUPABASE');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'RETAINED');
CREATE TYPE "RoleCode" AS ENUM ('FREE_USER', 'PREMIUM_USER', 'CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN');

ALTER TABLE "User"
ADD COLUMN "authProvider" "IdentityProvider" NOT NULL DEFAULT 'SUPABASE',
ADD COLUMN "externalSubject" TEXT,
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'vi-VN',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" "RoleCode" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedByUserId" TEXT,
    "assignmentReason" TEXT,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId")
);

INSERT INTO "Role" ("id", "code", "description", "updatedAt") VALUES
('role-free-user', 'FREE_USER', 'Default registered learner role.', CURRENT_TIMESTAMP),
('role-premium-user', 'PREMIUM_USER', 'Future paid learner role.', CURRENT_TIMESTAMP),
('role-content-editor', 'CONTENT_EDITOR', 'Content authoring and review role.', CURRENT_TIMESTAMP),
('role-admin', 'ADMIN', 'Application administration role.', CURRENT_TIMESTAMP),
('role-super-admin', 'SUPER_ADMIN', 'Restricted platform administration role.', CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX "User_authProvider_externalSubject_key" ON "User"("authProvider", "externalSubject");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");
CREATE INDEX "UserRole_assignedByUserId_idx" ON "UserRole"("assignedByUserId");

ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_assignedByUserId_fkey"
FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rollback notes (manual, never run automatically): drop the four foreign keys, then
-- UserRole, Role (including canonical role rows), and UserProfile; drop the three indexes on User/Role; remove the three
-- added User columns; finally drop RoleCode, UserStatus, and IdentityProvider. Preserve
-- the original User id/email/name/createdAt/updatedAt columns and all existing rows.
