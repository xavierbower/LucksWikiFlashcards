import fs from 'fs';
import path from 'path';
import { validate, FlashcardDatabaseSchema } from './lib/schema-validators.js';

export default async function exportSiteData(takeaways, relationships, flashcards) {
  console.log('Step 6: Export site data');

  if (!takeaways) {
    takeaways = JSON.parse(fs.readFileSync(path.resolve('data/takeaways.json'), 'utf-8'));
  }
  if (!relationships) {
    relationships = JSON.parse(fs.readFileSync(path.resolve('data/relationships.json'), 'utf-8'));
  }
  if (!flashcards) {
    flashcards = JSON.parse(fs.readFileSync(path.resolve('data/flashcards.json'), 'utf-8'));
  }

  const database = {
    generatedAt: new Date().toISOString(),
    stats: {
      totalPages: new Set(takeaways.map(t => t.sourcePageId)).size,
      totalTakeaways: takeaways.length,
      totalRelationships: relationships.length,
      totalFlashcards: flashcards.length,
    },
    takeaways,
    relationships,
    flashcards,
  };

  // Validate
  const result = validate(FlashcardDatabaseSchema, database);
  if (!result.success) {
    console.warn('Validation warnings:', result.error.issues.slice(0, 5));
  }

  // Write to docs/data/
  const outDir = path.resolve('docs/data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'flashcards.json');
  fs.writeFileSync(outPath, JSON.stringify(database, null, 2));

  console.log(`Exported database to ${outPath}`);
  console.log(`  Pages: ${database.stats.totalPages}`);
  console.log(`  Takeaways: ${database.stats.totalTakeaways}`);
  console.log(`  Relationships: ${database.stats.totalRelationships}`);
  console.log(`  Flashcards: ${database.stats.totalFlashcards}`);

  return database;
}

if (process.argv[1] && process.argv[1].endsWith('06-export-site-data.js')) {
  exportSiteData().catch(err => { console.error(err); process.exit(1); });
}
