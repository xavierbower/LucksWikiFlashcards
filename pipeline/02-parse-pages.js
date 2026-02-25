import fs from 'fs';
import path from 'path';
import { listWikiPages, getAuthors, getLastModified, WIKI_DIR } from './lib/git-utils.js';
import { parseSections, extractTitle } from './lib/markdown-parser.js';
import { validate, PagesArraySchema } from './lib/schema-validators.js';

export default async function parsePages() {
  console.log('Step 2: Parse wiki pages');

  const filenames = listWikiPages();
  console.log(`Found ${filenames.length} markdown files`);

  const pages = [];

  for (const filename of filenames) {
    const filePath = path.join(WIKI_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const title = extractTitle(raw, filename);
    const sections = parseSections(raw);
    const authors = getAuthors(filename);
    const lastModified = getLastModified(filename);

    const id = filename
      .replace(/\.md$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

    pages.push({ id, filename, title, sections, authors, lastModified, raw });
  }

  // Validate
  const result = validate(PagesArraySchema, pages);
  if (!result.success) {
    console.warn('Validation warnings:', result.error.issues.slice(0, 5));
  }

  // Write output
  const outPath = path.resolve('data/pages.json');
  fs.writeFileSync(outPath, JSON.stringify(pages, null, 2));
  console.log(`Wrote ${pages.length} pages to ${outPath}`);

  return pages;
}

if (process.argv[1] && process.argv[1].endsWith('02-parse-pages.js')) {
  parsePages().catch(err => { console.error(err); process.exit(1); });
}
