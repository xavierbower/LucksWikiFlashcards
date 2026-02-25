import { cloneOrPullWiki } from './lib/git-utils.js';

export default async function cloneWiki() {
  console.log('Step 1: Clone/pull wiki repository');
  const wikiDir = cloneOrPullWiki();
  console.log(`Wiki directory: ${wikiDir}`);
  return wikiDir;
}

// Run directly
if (process.argv[1] && process.argv[1].endsWith('01-clone-wiki.js')) {
  cloneWiki().catch(err => { console.error(err); process.exit(1); });
}
