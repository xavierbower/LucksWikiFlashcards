// ── System prompts ──

export const EXTRACTION_SYSTEM = `You are a knowledge extraction assistant for the Lucks Lab at Northwestern University (synthetic biology). You extract structured knowledge from lab wiki pages.

You MUST respond with valid JSON only — no extra text, no markdown fences.`;

export const RELATIONSHIP_SYSTEM = `You are a knowledge graph assistant for the Lucks Lab at Northwestern University (synthetic biology). You identify relationships between knowledge units extracted from a lab wiki.

You MUST respond with valid JSON only — no extra text, no markdown fences.`;

export const FLASHCARD_SYSTEM = `You are an expert flashcard author for the Lucks Lab at Northwestern University (synthetic biology). You create high-quality flashcards calibrated to different familiarity levels.

You MUST respond with valid JSON only — no extra text, no markdown fences.`;

// ── User prompt templates ──

/**
 * Build the extraction prompt for a single wiki page.
 */
export function extractionPrompt(page) {
  return `Analyze this lab wiki page and extract structured knowledge takeaways.

Page title: ${page.title}
Page filename: ${page.filename}

Content:
${page.raw}

For each distinct piece of knowledge, extract:
- category: one of "protocol", "concept", "tool", "project", "finding"
- title: short descriptive title
- summary: 1-2 sentence summary
- details: array of specific detail bullets (strings)
- tags: array of relevant tags (lowercase, no spaces — use underscores)
- confidence: 0-1 score for how well-supported the information is

Return a JSON array of objects with these fields:
[
  {
    "category": "protocol",
    "title": "...",
    "summary": "...",
    "details": ["...", "..."],
    "tags": ["...", "..."],
    "confidence": 0.9
  }
]

If the page has no meaningful knowledge to extract (e.g. it's a navigation page), return an empty array: []`;
}

/**
 * Build the relationship-building prompt.
 */
export function relationshipPrompt(takeawaySummaries) {
  return `Given these knowledge takeaways from a lab wiki, identify meaningful relationships between them.

Takeaways:
${takeawaySummaries.map(t => `- [${t.id}] (${t.category}) ${t.title}: ${t.summary}`).join('\n')}

For each relationship, specify:
- sourceId: the ID of the source takeaway
- targetId: the ID of the target takeaway
- type: one of "uses", "extends", "requires", "related_to", "part_of", "produces"
- description: brief explanation of the relationship

Only include relationships that are clearly supported. Quality over quantity.

Return a JSON array:
[
  {
    "sourceId": "...",
    "targetId": "...",
    "type": "uses",
    "description": "..."
  }
]

If no meaningful relationships exist, return an empty array: []`;
}

/**
 * Build the flashcard generation prompt for a takeaway.
 */
export function flashcardPrompt(takeaway, relatedTakeaways) {
  const relatedContext = relatedTakeaways.length > 0
    ? `\n\nRelated knowledge:\n${relatedTakeaways.map(t => `- (${t.category}) ${t.title}: ${t.summary}`).join('\n')}`
    : '';

  return `Generate flashcards for this lab wiki knowledge at three familiarity levels.

Takeaway: ${takeaway.title}
Category: ${takeaway.category}
Summary: ${takeaway.summary}
Details:
${takeaway.details.map(d => `- ${d}`).join('\n')}
Tags: ${takeaway.tags.join(', ')}${relatedContext}

Generate flashcards at these levels:

1. **new_member** (2-3 cards): Define terms, explain significance, include hints. Someone new to the lab who may not know lab-specific vocabulary.

2. **experienced** (1-2 cards): Assumes lab vocabulary, focuses on specifics, edge cases, or procedural details. No hints needed.

3. **pi** (1 card): Strategic connections, cross-project implications, or design rationale. High-level thinking.

Return a JSON array:
[
  {
    "familiarityLevel": "new_member",
    "question": "...",
    "answer": "...",
    "hint": "..."
  }
]

Each card must have: familiarityLevel, question, answer. hint is optional (recommended for new_member only).`;
}
