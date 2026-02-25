/**
 * Generate flashcards locally (no API calls) using templates.
 * Produces 3 cards per takeaway at different familiarity levels.
 */
import fs from 'fs';
import path from 'path';
import { validate, FlashcardsArraySchema } from './lib/schema-validators.js';

// ── Templates by category + level ──

const templates = {
  new_member: {
    protocol: (t) => ({
      question: `What is the purpose of the ${t.title} protocol?`,
      answer: t.summary + (t.details.length > 0 ? ` Key steps include: ${t.details.slice(0, 2).join('; ')}.` : ''),
      hint: `This is a ${t.category} used in the Lucks Lab.`,
    }),
    concept: (t) => ({
      question: `What is ${t.title}?`,
      answer: t.summary,
      hint: t.details[0] || `This is a key concept in the lab's research.`,
    }),
    tool: (t) => ({
      question: `What is ${t.title} used for in the lab?`,
      answer: t.summary,
      hint: `This is a ${t.tags.includes('software') ? 'software' : 'lab'} tool.`,
    }),
    project: (t) => ({
      question: `What is the ${t.title} project about?`,
      answer: t.summary,
      hint: `This is a research project in the Lucks Lab.`,
    }),
    finding: (t) => ({
      question: `What was discovered regarding ${t.title.toLowerCase()}?`,
      answer: t.summary,
      hint: `This is a research finding from the lab.`,
    }),
  },
  experienced: {
    protocol: (t) => ({
      question: t.details.length >= 2
        ? `In the ${t.title} protocol, what are the critical steps or reagents?`
        : `What are the key details of the ${t.title} protocol?`,
      answer: t.details.length > 0
        ? t.details.join('. ') + '.'
        : t.summary,
    }),
    concept: (t) => ({
      question: `How does ${t.title.toLowerCase()} relate to the lab's experimental approaches?`,
      answer: t.summary + (t.details.length > 1 ? ` Specifically: ${t.details.slice(1).join('; ')}.` : ''),
    }),
    tool: (t) => ({
      question: `What are the key features or parameters of ${t.title}?`,
      answer: t.details.length > 0 ? t.details.join('. ') + '.' : t.summary,
    }),
    project: (t) => ({
      question: `What are the specific methods or approaches used in ${t.title}?`,
      answer: t.details.length > 0 ? t.details.join('. ') + '.' : t.summary,
    }),
    finding: (t) => ({
      question: `What evidence supports the finding about ${t.title.toLowerCase()}?`,
      answer: t.details.length > 0 ? t.details.join('. ') + '.' : t.summary,
    }),
  },
  pi: {
    protocol: (t) => ({
      question: `What are the limitations or potential improvements to the ${t.title} protocol?`,
      answer: `${t.summary} Considerations for optimization include the specific conditions described: ${t.details.slice(0, 2).join('; ') || 'see protocol details'}.`,
    }),
    concept: (t) => ({
      question: `How could ${t.title.toLowerCase()} be leveraged for new research directions?`,
      answer: `${t.summary} This connects to broader themes in RNA biology and synthetic biology, with potential applications in ${t.tags.slice(0, 3).join(', ') || 'related areas'}.`,
    }),
    tool: (t) => ({
      question: `How does ${t.title} fit into the lab's computational/experimental infrastructure?`,
      answer: `${t.summary} This tool addresses needs in ${t.tags.slice(0, 3).join(', ') || 'the lab workflow'}.`,
    }),
    project: (t) => ({
      question: `What are the strategic implications of the ${t.title} project?`,
      answer: t.summary + (t.details.length > 0 ? ` Key aspects: ${t.details.join('; ')}.` : ''),
    }),
    finding: (t) => ({
      question: `How does the finding about ${t.title.toLowerCase()} impact the lab's research strategy?`,
      answer: t.summary + (t.details.length > 0 ? ` Supporting details: ${t.details.join('; ')}.` : ''),
    }),
  },
};

// Default fallback for unknown categories
const defaultTemplate = (level, t) => ({
  question: level === 'new_member'
    ? `What is ${t.title}?`
    : level === 'experienced'
      ? `What are the key details of ${t.title}?`
      : `What are the strategic implications of ${t.title}?`,
  answer: t.summary + (t.details.length > 0 ? ` Details: ${t.details.join('; ')}.` : ''),
  ...(level === 'new_member' ? { hint: `Category: ${t.category}` } : {}),
});

export default async function generateFlashcardsLocal(takeaways, relationships) {
  console.log('Step 5: Generate flashcards (local, no API)');

  if (!takeaways) {
    takeaways = JSON.parse(fs.readFileSync(path.resolve('data/takeaways.json'), 'utf-8'));
  }
  if (!relationships) {
    relationships = JSON.parse(fs.readFileSync(path.resolve('data/relationships.json'), 'utf-8'));
  }

  const allFlashcards = [];
  let idCounter = 1;
  const levels = ['new_member', 'experienced', 'pi'];

  for (const takeaway of takeaways) {
    for (const level of levels) {
      const templateFn = templates[level]?.[takeaway.category];
      const card = templateFn
        ? templateFn(takeaway)
        : defaultTemplate(level, takeaway);

      allFlashcards.push({
        id: `card-${idCounter++}`,
        takeawayIds: [takeaway.id],
        category: takeaway.category,
        familiarityLevel: level,
        question: card.question,
        answer: card.answer,
        hint: card.hint || undefined,
        relatedCardIds: [],
        tags: takeaway.tags || [],
      });
    }
  }

  // Link related cards via relationships
  const cardsByTakeaway = new Map();
  for (const card of allFlashcards) {
    for (const tid of card.takeawayIds) {
      if (!cardsByTakeaway.has(tid)) cardsByTakeaway.set(tid, []);
      cardsByTakeaway.get(tid).push(card.id);
    }
  }

  for (const rel of relationships) {
    const sourceCards = cardsByTakeaway.get(rel.sourceId) || [];
    const targetCards = cardsByTakeaway.get(rel.targetId) || [];
    for (const sc of sourceCards) {
      const card = allFlashcards.find(c => c.id === sc);
      if (card) card.relatedCardIds.push(...targetCards.filter(id => id !== sc));
    }
    for (const tc of targetCards) {
      const card = allFlashcards.find(c => c.id === tc);
      if (card) card.relatedCardIds.push(...sourceCards.filter(id => id !== tc));
    }
  }

  // Deduplicate relatedCardIds
  for (const card of allFlashcards) {
    card.relatedCardIds = [...new Set(card.relatedCardIds)];
  }

  // Validate
  const result = validate(FlashcardsArraySchema, allFlashcards);
  if (!result.success) {
    console.warn('Validation warnings:', result.error.issues.slice(0, 5));
  }

  const outPath = path.resolve('data/flashcards.json');
  fs.writeFileSync(outPath, JSON.stringify(allFlashcards, null, 2));
  console.log(`Wrote ${allFlashcards.length} flashcards to ${outPath}`);

  return allFlashcards;
}

if (process.argv[1] && process.argv[1].endsWith('05-generate-flashcards-local.js')) {
  generateFlashcardsLocal().catch(err => { console.error(err); process.exit(1); });
}
