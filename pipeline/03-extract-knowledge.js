import fs from 'fs';
import path from 'path';
import { askJSON } from './lib/claude-client.js';
import { EXTRACTION_SYSTEM, extractionPrompt } from './lib/prompts.js';
import { validate, TakeawaysArraySchema } from './lib/schema-validators.js';

const MIN_CONTENT_LENGTH = 200; // Skip pages shorter than this
const BATCH_CHAR_LIMIT = 6000; // Combine small pages up to this total size

/**
 * Build a combined extraction prompt for multiple small pages.
 */
function batchExtractionPrompt(pages) {
  const combined = pages.map(p =>
    `--- Page: ${p.title} (${p.filename}) ---\n${p.raw}`
  ).join('\n\n');

  return `Analyze these lab wiki pages and extract structured knowledge takeaways from each.

${combined}

For each distinct piece of knowledge, extract:
- sourcePageTitle: which page it came from
- category: one of "protocol", "concept", "tool", "project", "finding"
- title: short descriptive title
- summary: 1-2 sentence summary
- details: array of specific detail bullets (strings)
- tags: array of relevant tags (lowercase, underscores)
- confidence: 0-1 score

Return a JSON array. If a page has no meaningful knowledge, skip it.
[{ "sourcePageTitle": "...", "category": "...", "title": "...", "summary": "...", "details": [], "tags": [], "confidence": 0.9 }]`;
}

export default async function extractKnowledge(pages) {
  console.log('Step 3: Extract knowledge from wiki pages');

  if (!pages) {
    pages = JSON.parse(fs.readFileSync(path.resolve('data/pages.json'), 'utf-8'));
  }

  // Filter out trivial pages
  const substantivePages = pages.filter(p => p.raw.length >= MIN_CONTENT_LENGTH);
  const skippedCount = pages.length - substantivePages.length;
  console.log(`  Skipping ${skippedCount} pages under ${MIN_CONTENT_LENGTH} chars`);
  console.log(`  Processing ${substantivePages.length} substantive pages`);

  // Sort by size — small pages get batched, large pages go solo
  const sorted = [...substantivePages].sort((a, b) => a.raw.length - b.raw.length);

  // Build batches: group small pages together, large pages alone
  const batches = [];
  let currentBatch = [];
  let currentBatchSize = 0;

  for (const page of sorted) {
    if (page.raw.length > BATCH_CHAR_LIMIT) {
      // Large page goes solo
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }
      batches.push([page]);
    } else if (currentBatchSize + page.raw.length > BATCH_CHAR_LIMIT) {
      // Current batch is full, start a new one
      batches.push(currentBatch);
      currentBatch = [page];
      currentBatchSize = page.raw.length;
    } else {
      currentBatch.push(page);
      currentBatchSize += page.raw.length;
    }
  }
  if (currentBatch.length > 0) batches.push(currentBatch);

  console.log(`  Organized into ${batches.length} API calls (was ${substantivePages.length} before batching)`);

  const allTakeaways = [];
  let idCounter = 1;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const isSingle = batch.length === 1;
    const label = isSingle
      ? `${batch[0].title} (${batch[0].filename})`
      : `batch of ${batch.length} pages`;

    console.log(`  [${i + 1}/${batches.length}] Extracting from: ${label}`);

    try {
      const prompt = isSingle
        ? extractionPrompt(batch[0])
        : batchExtractionPrompt(batch);

      const raw = await askJSON({
        system: EXTRACTION_SYSTEM,
        userMessage: prompt,
        maxTokens: isSingle ? 2048 : 4096,
      });

      if (!Array.isArray(raw) || raw.length === 0) {
        console.log(`    No takeaways extracted`);
        continue;
      }

      for (const item of raw) {
        // Match to source page
        let sourcePageId = batch[0].id;
        if (!isSingle && item.sourcePageTitle) {
          const match = batch.find(p =>
            p.title.toLowerCase() === item.sourcePageTitle.toLowerCase() ||
            p.filename.toLowerCase().includes(item.sourcePageTitle.toLowerCase().replace(/\s+/g, '-'))
          );
          if (match) sourcePageId = match.id;
        }

        const sourcePage = batch.find(p => p.id === sourcePageId) || batch[0];

        allTakeaways.push({
          id: `takeaway-${idCounter++}`,
          sourcePageId,
          sourceSection: item.title || '',
          category: item.category || 'concept',
          title: item.title || 'Untitled',
          summary: item.summary || '',
          details: item.details || [],
          tags: item.tags || [],
          authors: sourcePage.authors || [],
          confidence: item.confidence ?? 0.7,
        });
      }

      console.log(`    Extracted ${raw.length} takeaways`);
    } catch (err) {
      console.error(`    Error extracting from ${label}:`, err.message);
    }
  }

  // Validate
  const result = validate(TakeawaysArraySchema, allTakeaways);
  if (!result.success) {
    console.warn('Validation warnings:', result.error.issues.slice(0, 5));
  }

  const outPath = path.resolve('data/takeaways.json');
  fs.writeFileSync(outPath, JSON.stringify(allTakeaways, null, 2));
  console.log(`Wrote ${allTakeaways.length} takeaways to ${outPath}`);

  return allTakeaways;
}

if (process.argv[1] && process.argv[1].endsWith('03-extract-knowledge.js')) {
  extractKnowledge().catch(err => { console.error(err); process.exit(1); });
}
