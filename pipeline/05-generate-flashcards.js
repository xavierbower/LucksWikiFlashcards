import fs from 'fs';
import path from 'path';
import { askJSON } from './lib/claude-client.js';
import { FLASHCARD_SYSTEM } from './lib/prompts.js';
import { validate, FlashcardsArraySchema } from './lib/schema-validators.js';

const BATCH_SIZE = 15; // Takeaways per API call

/**
 * Build a batched flashcard prompt for multiple takeaways.
 */
function batchFlashcardPrompt(takeaways) {
  const items = takeaways.map(t =>
    `[${t.id}] (${t.category}) ${t.title}: ${t.summary}`
  ).join('\n');

  return `Generate flashcards for these lab wiki knowledge items at three familiarity levels.

Takeaways:
${items}

For EACH takeaway, generate:
- 1 new_member card (defines terms, includes hint)
- 1 experienced card (assumes vocabulary, focuses on specifics)
- 1 pi card (strategic connections, cross-project implications)

Return a JSON array:
[
  {
    "takeawayId": "takeaway-X",
    "familiarityLevel": "new_member",
    "question": "...",
    "answer": "...",
    "hint": "..."
  }
]

Keep answers concise (2-3 sentences). hint is only for new_member cards.`;
}

export default async function generateFlashcards(takeaways, relationships) {
  console.log('Step 5: Generate flashcards');

  if (!takeaways) {
    takeaways = JSON.parse(fs.readFileSync(path.resolve('data/takeaways.json'), 'utf-8'));
  }
  if (!relationships) {
    relationships = JSON.parse(fs.readFileSync(path.resolve('data/relationships.json'), 'utf-8'));
  }

  const allFlashcards = [];
  let idCounter = 1;

  // Batch takeaways
  const totalBatches = Math.ceil(takeaways.length / BATCH_SIZE);
  console.log(`  Processing ${takeaways.length} takeaways in ${totalBatches} batches of ~${BATCH_SIZE}`);

  for (let i = 0; i < takeaways.length; i += BATCH_SIZE) {
    const batch = takeaways.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`  [${batchNum}/${totalBatches}] Generating cards for ${batch.length} takeaways`);

    try {
      const raw = await askJSON({
        system: FLASHCARD_SYSTEM,
        userMessage: batchFlashcardPrompt(batch),
        maxTokens: 4096,
      });

      if (!Array.isArray(raw)) continue;

      // Build a set of valid takeaway IDs in this batch
      const batchIds = new Set(batch.map(t => t.id));
      const batchMap = new Map(batch.map(t => [t.id, t]));

      for (const card of raw) {
        const takeawayId = card.takeawayId && batchIds.has(card.takeawayId)
          ? card.takeawayId
          : batch[0].id;
        const takeaway = batchMap.get(takeawayId) || batch[0];

        allFlashcards.push({
          id: `card-${idCounter++}`,
          takeawayIds: [takeawayId],
          category: takeaway.category,
          familiarityLevel: card.familiarityLevel || 'new_member',
          question: card.question || '',
          answer: card.answer || '',
          hint: card.hint || undefined,
          relatedCardIds: [],
          tags: takeaway.tags || [],
        });
      }

      console.log(`    Generated ${raw.length} cards`);
    } catch (err) {
      console.error(`    Error:`, err.message);
    }
  }

  // Link related cards via relationships
  const cardsByTakeaway = new Map();
  for (const card of allFlashcards) {
    for (const tid of card.takeawayIds) {
      if (!cardsByTakeaway.has(tid)) cardsByTakeaway.set(tid, []);
      cardsByTakeaway.get(tid).push(card.id);
    }
  }

  for (const rel of relationships) {
    const sourceCards = cardsByTakeaway.get(rel.sourceId) || [];
    const targetCards = cardsByTakeaway.get(rel.targetId) || [];
    for (const sc of sourceCards) {
      const card = allFlashcards.find(c => c.id === sc);
      if (card) card.relatedCardIds.push(...targetCards.filter(id => id !== sc));
    }
    for (const tc of targetCards) {
      const card = allFlashcards.find(c => c.id === tc);
      if (card) card.relatedCardIds.push(...sourceCards.filter(id => id !== tc));
    }
  }

  // Deduplicate relatedCardIds
  for (const card of allFlashcards) {
    card.relatedCardIds = [...new Set(card.relatedCardIds)];
  }

  // Validate
  const result = validate(FlashcardsArraySchema, allFlashcards);
  if (!result.success) {
    console.warn('Validation warnings:', result.error.issues.slice(0, 5));
  }

  const outPath = path.resolve('data/flashcards.json');
  fs.writeFileSync(outPath, JSON.stringify(allFlashcards, null, 2));
  console.log(`Wrote ${allFlashcards.length} flashcards to ${outPath}`);

  return allFlashcards;
}

if (process.argv[1] && process.argv[1].endsWith('05-generate-flashcards.js')) {
  generateFlashcards().catch(err => { console.error(err); process.exit(1); });
}
