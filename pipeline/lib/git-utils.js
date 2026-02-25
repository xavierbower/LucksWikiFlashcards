import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const WIKI_REPO = 'LucksLab/Lucks_Lab.wiki';
const DATA_DIR = path.resolve('data');
const WIKI_DIR = path.join(DATA_DIR, 'wiki-repo');

/**
 * Clone or pull the wiki repo.
 */
export function cloneOrPullWiki() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  if (existsSync(path.join(WIKI_DIR, '.git'))) {
    console.log('Wiki repo exists, pulling latest changes...');
    execSync('git pull', { cwd: WIKI_DIR, stdio: 'inherit' });
  } else {
    console.log('Cloning wiki repo...');
    const url = `https://${token}@github.com/${WIKI_REPO}.git`;
    execSync(`git clone "${url}" "${WIKI_DIR}"`, { stdio: 'inherit' });
  }

  return WIKI_DIR;
}

/**
 * Get the list of markdown files in the wiki repo.
 * @returns {string[]} Array of filenames (e.g., "Home.md")
 */
export function listWikiPages() {
  const output = execSync('find . -name "*.md" -type f', {
    cwd: WIKI_DIR,
    encoding: 'utf-8',
  });
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(f => f.replace(/^\.\//, ''));
}

/**
 * Get git blame authors for a file.
 * @param {string} filename - Relative path within wiki repo
 * @returns {string[]} Unique author names
 */
export function getAuthors(filename) {
  try {
    const output = execSync(
      `git blame --porcelain "${filename}" | grep "^author " | sort -u`,
      { cwd: WIKI_DIR, encoding: 'utf-8' }
    );
    return [...new Set(
      output.trim().split('\n')
        .filter(Boolean)
        .map(line => line.replace(/^author /, '').trim())
        .filter(name => name && name !== 'Not Committed Yet')
    )];
  } catch {
    return [];
  }
}

/**
 * Get last modified date for a file.
 * @param {string} filename
 * @returns {string} ISO date string
 */
export function getLastModified(filename) {
  try {
    const output = execSync(
      `git log -1 --format="%aI" -- "${filename}"`,
      { cwd: WIKI_DIR, encoding: 'utf-8' }
    );
    return output.trim() || new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Get SHA hash of a file for change detection.
 * @param {string} filename
 * @returns {string}
 */
export function getFileHash(filename) {
  try {
    const output = execSync(
      `git hash-object "${filename}"`,
      { cwd: WIKI_DIR, encoding: 'utf-8' }
    );
    return output.trim();
  } catch {
    return '';
  }
}

/**
 * Get the current HEAD commit SHA.
 * @returns {string}
 */
export function getHeadSha() {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: WIKI_DIR,
      encoding: 'utf-8',
    }).trim();
  } catch {
    return '';
  }
}

export { WIKI_DIR };
