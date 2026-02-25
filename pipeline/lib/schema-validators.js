import { z } from 'zod';

// ── Takeaway (knowledge unit) ──
export const TakeawaySchema = z.object({
  id: z.string(),
  sourcePageId: z.string(),
  sourceSection: z.string(),
  category: z.enum(['protocol', 'concept', 'tool', 'project', 'finding']),
  title: z.string(),
  summary: z.string(),
  details: z.array(z.string()),
  tags: z.array(z.string()),
  authors: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const TakeawaysArraySchema = z.array(TakeawaySchema);

// ── Relationship ──
export const RelationshipSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  type: z.enum(['uses', 'extends', 'requires', 'related_to', 'part_of', 'produces']),
  description: z.string(),
});

export const RelationshipsArraySchema = z.array(RelationshipSchema);

// ── Flashcard ──
export const FlashcardSchema = z.object({
  id: z.string(),
  takeawayIds: z.array(z.string()),
  category: z.enum(['protocol', 'concept', 'tool', 'project', 'finding']),
  familiarityLevel: z.enum(['new_member', 'experienced', 'pi']),
  question: z.string(),
  answer: z.string(),
  hint: z.string().optional(),
  relatedCardIds: z.array(z.string()),
  tags: z.array(z.string()),
});

export const FlashcardsArraySchema = z.array(FlashcardSchema);

// ── Page (parsed wiki page) ──
export const PageSchema = z.object({
  id: z.string(),
  filename: z.string(),
  title: z.string(),
  sections: z.array(z.object({
    heading: z.string(),
    level: z.number(),
    content: z.string(),
  })),
  authors: z.array(z.string()),
  lastModified: z.string(),
  raw: z.string(),
});

export const PagesArraySchema = z.array(PageSchema);

// ── FlashcardDatabase (final export) ──
export const FlashcardDatabaseSchema = z.object({
  generatedAt: z.string(),
  stats: z.object({
    totalPages: z.number(),
    totalTakeaways: z.number(),
    totalRelationships: z.number(),
    totalFlashcards: z.number(),
  }),
  takeaways: TakeawaysArraySchema,
  relationships: RelationshipsArraySchema,
  flashcards: FlashcardsArraySchema,
});

// ── Manifest (incremental build tracking) ──
export const ManifestSchema = z.object({
  lastRunAt: z.string(),
  pageHashes: z.record(z.string()),
});

/**
 * Validate data against a schema, returning { success, data, error }.
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, error: null };
  }
  return { success: false, data: null, error: result.error };
}
