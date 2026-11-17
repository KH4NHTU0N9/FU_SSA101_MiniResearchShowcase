-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('ACADEMIC', 'PSYCHOLOGY', 'RESOURCES', 'OTHER');

-- AlterTable User
ALTER TABLE "User"
  ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "resetCode" TEXT,
  ADD COLUMN "resetAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "resetCodeExpires" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateTable PendingRegistration
CREATE TABLE "PendingRegistration" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingRegistration_email_key" ON "PendingRegistration"("email");
CREATE INDEX "PendingRegistration_expiresAt_idx" ON "PendingRegistration"("expiresAt");

-- CreateTable PendingEmailChange
CREATE TABLE "PendingEmailChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingEmailChange_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingEmailChange_userId_key" ON "PendingEmailChange"("userId");
CREATE INDEX "PendingEmailChange_expiresAt_idx" ON "PendingEmailChange"("expiresAt");

-- AlterTable Task
ALTER TABLE "Task" ADD COLUMN "groupId" TEXT;

-- CreateTable Post
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "PostCategory" NOT NULL DEFAULT 'OTHER',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable Comment
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable PostLike
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable Semester
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable Subject
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable Material
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileContent" TEXT,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "totalDownloads" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "semesterId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable MaterialReport
CREATE TABLE "MaterialReport" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable MaterialFile
CREATE TABLE "MaterialFile" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileContent" TEXT,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assessment_userId_createdAt_idx" ON "Assessment"("userId", "createdAt");
CREATE INDEX "MoodLog_userId_createdAt_idx" ON "MoodLog"("userId", "createdAt");
CREATE INDEX "Chat_userId_createdAt_idx" ON "Chat"("userId", "createdAt");
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");
CREATE INDEX "FlashcardDeck_userId_createdAt_idx" ON "FlashcardDeck"("userId", "createdAt");
CREATE INDEX "Flashcard_deckId_idx" ON "Flashcard"("deckId");
CREATE INDEX "FixedEvent_userId_idx" ON "FixedEvent"("userId");
CREATE INDEX "FixedEvent_userId_day_idx" ON "FixedEvent"("userId", "day");
CREATE INDEX "Task_userId_idx" ON "Task"("userId");
CREATE INDEX "Task_groupId_idx" ON "Task"("groupId");
CREATE INDEX "Task_userId_groupId_idx" ON "Task"("userId", "groupId");
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX "Post_category_idx" ON "Post"("category");
CREATE INDEX "Post_category_createdAt_idx" ON "Post"("category", "createdAt");
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");
CREATE UNIQUE INDEX "PostLike_userId_postId_key" ON "PostLike"("userId", "postId");
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");
CREATE UNIQUE INDEX "Semester_name_key" ON "Semester"("name");
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");
CREATE INDEX "Subject_semesterId_idx" ON "Subject"("semesterId");
CREATE INDEX "Material_semesterId_idx" ON "Material"("semesterId");
CREATE INDEX "Material_subjectId_idx" ON "Material"("subjectId");
CREATE INDEX "Material_uploadedById_idx" ON "Material"("uploadedById");
CREATE INDEX "Material_status_createdAt_idx" ON "Material"("status", "createdAt");
CREATE INDEX "MaterialReport_materialId_idx" ON "MaterialReport"("materialId");
CREATE INDEX "MaterialFile_materialId_idx" ON "MaterialFile"("materialId");

-- AddForeignKey
ALTER TABLE "PendingEmailChange" ADD CONSTRAINT "PendingEmailChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Material" ADD CONSTRAINT "Material_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Material" ADD CONSTRAINT "Material_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Material" ADD CONSTRAINT "Material_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialReport" ADD CONSTRAINT "MaterialReport_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialFile" ADD CONSTRAINT "MaterialFile_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
