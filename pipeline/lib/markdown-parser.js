/**
 * Parse a markdown string into sections by heading.
 * @param {string} markdown - Raw markdown content
 * @returns {{ heading: string, level: number, content: string }[]}
 */
export function parseSections(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let currentSection = { heading: 'Introduction', level: 0, content: [] };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      // Save previous section
      if (currentSection.content.length > 0 || sections.length === 0) {
        sections.push({
          heading: currentSection.heading,
          level: currentSection.level,
          content: currentSection.content.join('\n').trim(),
        });
      }
      currentSection = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        content: [],
      };
    } else {
      currentSection.content.push(line);
    }
  }

  // Push last section
  sections.push({
    heading: currentSection.heading,
    level: currentSection.level,
    content: currentSection.content.join('\n').trim(),
  });

  return sections.filter(s => s.content.length > 0);
}

/**
 * Extract the title from a markdown file (first H1 or filename).
 * @param {string} markdown
 * @param {string} filename
 * @returns {string}
 */
export function extractTitle(markdown, filename) {
  const match = markdown.match(/^#\s+(.+)/m);
  if (match) return match[1].trim();
  // Fall back to filename without extension, replacing hyphens/underscores
  return filename
    .replace(/\.md$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
