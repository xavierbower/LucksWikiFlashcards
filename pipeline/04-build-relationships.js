import fs from 'fs';
import path from 'path';
import { askJSON } from './lib/claude-client.js';
import { RELATIONSHIP_SYSTEM, relationshipPrompt } from './lib/prompts.js';
import { validate, RelationshipsArraySchema } from './lib/schema-validators.js';

export default async function buildRelationships(takeaways) {
  console.log('Step 4: Build relationships between takeaways');

  if (!takeaways) {
    takeaways = JSON.parse(fs.readFileSync(path.resolve('data/takeaways.json'), 'utf-8'));
  }

  if (takeaways.length === 0) {
    console.log('No takeaways to relate');
    fs.writeFileSync(path.resolve('data/relationships.json'), '[]');
    return [];
  }

  // Build summaries for the prompt
  const summaries = takeaways.map(t => ({
    id: t.id,
    category: t.category,
    title: t.title,
    summary: t.summary,
  }));

  // If there are many takeaways, batch them to stay within context limits
  const BATCH_SIZE = 50;
  const allRelationships = [];
  let idCounter = 1;

  for (let i = 0; i < summaries.length; i += BATCH_SIZE) {
    const batch = summaries.slice(i, i + BATCH_SIZE);
    console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} takeaways)`);

    try {
      const raw = await askJSON({
        system: RELATIONSHIP_SYSTEM,
        userMessage: relationshipPrompt(batch),
        maxTokens: 4096,
      });

      if (!Array.isArray(raw)) continue;

      for (const item of raw) {
        allRelationships.push({
          id: `rel-${idCounter++}`,
          sourceId: item.sourceId,
          targetId: item.targetId,
          type: item.type || 'related_to',
          description: item.description || '',
        });
      }

      console.log(`    Found ${raw.length} relationships`);
    } catch (err) {
      console.error(`    Error building relationships:`, err.message);
    }
  }

  // Validate
  const result = validate(RelationshipsArraySchema, allRelationships);
  if (!result.success) {
    console.warn('Validation warnings:', result.error.issues.slice(0, 5));
  }

  const outPath = path.resolve('data/relationships.json');
  fs.writeFileSync(outPath, JSON.stringify(allRelationships, null, 2));
  console.log(`Wrote ${allRelationships.length} relationships to ${outPath}`);

  return allRelationships;
}

if (process.argv[1] && process.argv[1].endsWith('04-build-relationships.js')) {
  buildRelationships().catch(err => { console.error(err); process.exit(1); });
}
