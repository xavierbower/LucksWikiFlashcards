import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import cloneWiki from './01-clone-wiki.js';
import parsePages from './02-parse-pages.js';
import extractKnowledge from './03-extract-knowledge.js';
import buildRelationships from './04-build-relationships.js';
import generateFlashcards from './05-generate-flashcards.js';
import exportSiteData from './06-export-site-data.js';
import { listWikiPages, getFileHash } from './lib/git-utils.js';

const MANIFEST_PATH = path.resolve('data/manifests/last-run.json');

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch {
    return { lastRunAt: null, pageHashes: {} };
  }
}

function saveManifest(pageHashes) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify({
    lastRunAt: new Date().toISOString(),
    pageHashes,
  }, null, 2));
}

async function runIncremental() {
  const start = Date.now();
  console.log('=== Lucks Wiki Flashcards Pipeline (Incremental) ===\n');

  try {
    // Step 1: Clone/pull
    await cloneWiki();

    // Determine changed pages
    const manifest = loadManifest();
    const currentFiles = listWikiPages();
    const currentHashes = {};
    const changedFiles = [];

    for (const file of currentFiles) {
      const hash = getFileHash(file);
      currentHashes[file] = hash;
      if (manifest.pageHashes[file] !== hash) {
        changedFiles.push(file);
      }
    }

    if (changedFiles.length === 0) {
      console.log('No wiki pages have changed since last run.');
      return;
    }

    console.log(`${changedFiles.length} pages changed:\n  ${changedFiles.join('\n  ')}\n`);

    // Step 2: Parse all pages (needed for relationship building)
    const allPages = await parsePages();
    const changedPageIds = new Set(
      changedFiles.map(f => f.replace(/\.md$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    );

    // Step 3: Re-extract knowledge only for changed pages
    // Load existing takeaways and filter out stale ones
    let existingTakeaways = [];
    try {
      existingTakeaways = JSON.parse(fs.readFileSync(path.resolve('data/takeaways.json'), 'utf-8'));
    } catch { /* first run */ }

    const unchangedTakeaways = existingTakeaways.filter(t => !changedPageIds.has(t.sourcePageId));
    const changedPages = allPages.filter(p => changedPageIds.has(p.id));

    console.log(`Re-extracting knowledge from ${changedPages.length} changed pages...`);
    const newTakeaways = await extractKnowledge(changedPages);
    const allTakeaways = [...unchangedTakeaways, ...newTakeaways];

    // Save merged takeaways
    fs.writeFileSync(path.resolve('data/takeaways.json'), JSON.stringify(allTakeaways, null, 2));

    // Step 4: Rebuild all relationships (global operation)
    const relationships = await buildRelationships(allTakeaways);

    // Step 5: Regenerate flashcards for affected takeaways
    const affectedTakeawayIds = new Set(newTakeaways.map(t => t.id));
    // Also include takeaways related to changed ones
    for (const rel of relationships) {
      if (affectedTakeawayIds.has(rel.sourceId)) affectedTakeawayIds.add(rel.targetId);
      if (affectedTakeawayIds.has(rel.targetId)) affectedTakeawayIds.add(rel.sourceId);
    }

    // Load existing flashcards and filter out affected ones
    let existingFlashcards = [];
    try {
      existingFlashcards = JSON.parse(fs.readFileSync(path.resolve('data/flashcards.json'), 'utf-8'));
    } catch { /* first run */ }

    const unchangedFlashcards = existingFlashcards.filter(
      c => !c.takeawayIds.some(id => affectedTakeawayIds.has(id))
    );

    const affectedTakeaways = allTakeaways.filter(t => affectedTakeawayIds.has(t.id));
    console.log(`Regenerating flashcards for ${affectedTakeaways.length} affected takeaways...`);
    const newFlashcards = await generateFlashcards(affectedTakeaways, relationships);

    const allFlashcards = [...unchangedFlashcards, ...newFlashcards];
    fs.writeFileSync(path.resolve('data/flashcards.json'), JSON.stringify(allFlashcards, null, 2));

    // Step 6: Export
    await exportSiteData(allTakeaways, relationships, allFlashcards);

    // Save manifest
    saveManifest(currentHashes);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n=== Incremental pipeline complete in ${elapsed}s ===`);
  } catch (err) {
    console.error('\nIncremental pipeline failed:', err);
    process.exit(1);
  }
}

runIncremental();
