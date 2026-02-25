import 'dotenv/config';
import cloneWiki from './01-clone-wiki.js';
import parsePages from './02-parse-pages.js';
import extractKnowledge from './03-extract-knowledge.js';
import buildRelationships from './04-build-relationships.js';
import generateFlashcards from './05-generate-flashcards.js';
import exportSiteData from './06-export-site-data.js';

async function runAll() {
  const start = Date.now();
  console.log('=== Lucks Wiki Flashcards Pipeline ===\n');

  try {
    await cloneWiki();
    const pages = await parsePages();
    const takeaways = await extractKnowledge(pages);
    const relationships = await buildRelationships(takeaways);
    const flashcards = await generateFlashcards(takeaways, relationships);
    await exportSiteData(takeaways, relationships, flashcards);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n=== Pipeline complete in ${elapsed}s ===`);
  } catch (err) {
    console.error('\nPipeline failed:', err);
    process.exit(1);
  }
}

runAll();
