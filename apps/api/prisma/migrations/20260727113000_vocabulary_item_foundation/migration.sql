-- Additive canonical vocabulary content. Taxonomy remains governed by the existing fixture boundary.
CREATE TABLE "GovernedVocabularyItem" (
  "id" TEXT NOT NULL,
  "taxonomyNodeId" TEXT NOT NULL,
  "word" TEXT NOT NULL,
  "meaning" TEXT NOT NULL,
  "example" TEXT,
  "pronunciation" TEXT,
  "source" TEXT NOT NULL,
  "license" TEXT NOT NULL,
  "reviewStatus" TEXT NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL,
  "publishStatus" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GovernedVocabularyItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GovernedVocabularyItem_taxonomyNodeId_reviewStatus_publishStatus_publishedAt_idx"
  ON "GovernedVocabularyItem"("taxonomyNodeId", "reviewStatus", "publishStatus", "publishedAt");
CREATE INDEX "GovernedVocabularyItem_word_idx" ON "GovernedVocabularyItem"("word");

INSERT INTO "GovernedVocabularyItem" ("id", "taxonomyNodeId", "word", "meaning", "example", "pronunciation", "source", "license", "reviewStatus", "reviewedAt", "publishStatus", "publishedAt", "updatedAt") VALUES
('vocab-work-001', 'workplace-meetings', 'agenda', 'chương trình họp', 'Please add this item to the meeting agenda.', '/əˈdʒen.də/', 'EnglishPath original fixture 001', 'CC0-1.0', 'REVIEWED', '2026-07-01T00:00:00Z', 'PUBLISHED', '2026-07-01T00:00:00Z', '2026-07-01T00:00:00Z'),
('vocab-work-002', 'workplace-meetings', 'clarify', 'làm rõ', 'Could you clarify the deadline?', '/ˈklær.ə.faɪ/', 'EnglishPath original fixture 002', 'CC0-1.0', 'REVIEWED', '2026-07-01T00:00:00Z', 'PUBLISHED', '2026-07-01T00:00:00Z', '2026-07-01T00:00:00Z'),
('vocab-work-003', 'workplace-meetings', 'deadline', 'hạn chót', 'The deadline is Friday afternoon.', '/ˈded.laɪn/', 'EnglishPath original fixture 003', 'CC0-1.0', 'REVIEWED', '2026-07-01T00:00:00Z', 'PUBLISHED', '2026-07-01T00:00:00Z', '2026-07-01T00:00:00Z'),
('vocab-work-004', 'workplace-meetings', 'follow-up', 'việc theo dõi sau đó', 'I will send a follow-up email tomorrow.', '/ˈfɒl.əʊ ʌp/', 'EnglishPath original fixture 004', 'CC0-1.0', 'REVIEWED', '2026-07-01T00:00:00Z', 'PUBLISHED', '2026-07-01T00:00:00Z', '2026-07-01T00:00:00Z'),
('vocab-work-005', 'workplace-meetings', 'proposal', 'đề xuất', 'Her proposal was accepted by the team.', '/prəˈpəʊ.zəl/', 'EnglishPath original fixture 005', 'CC0-1.0', 'REVIEWED', '2026-07-01T00:00:00Z', 'PUBLISHED', '2026-07-01T00:00:00Z', '2026-07-01T00:00:00Z');

-- Manual rollback (owner-approved only): drop GovernedVocabularyItem and its indexes.
