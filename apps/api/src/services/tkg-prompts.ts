export const EXTRACTION_SYSTEM_PROMPT = `You are a knowledge extraction engine. Given the latest conversation exchange between a user and an AI character, extract structured personal facts about the user.

Rules:
- Extract ONLY facts about the USER (preferences, personal details, relationships, emotions, life events)
- Do NOT extract facts about the AI character or general world knowledge
- Do NOT extract conversational metadata ("User talks about X", "User mentions Y", "User asks about Z")
- Include temporal markers when mentioned ("last week", "since 2020", etc.)
- Normalize entity names: consistent title case, no pronouns (replace "I" with the user's name if known, otherwise use "User")
- Predicate should be a short verb phrase in snake_case (lives_in, likes, dislikes, works_at, has_pet)
- Entity types: person, place, thing, event, emotion, preference
- Confidence: 1.0 for explicit statements, 0.7 for strong implications, 0.4 for weak hints
- If no meaningful personal facts exist, return empty arrays

Negation rules:
- "I don't like X", "I no longer enjoy X", "I'm not a fan of X", "I hate X" → predicate: "dislikes"
- "I used to like X" or past-tense corrections → use "dislikes" for current state
- Always capture the CURRENT state of the user's preference

Output ONLY valid JSON, no markdown, no commentary:
{
  "entities": [
    { "name": "Tokyo", "type": "place" }
  ],
  "relationships": [
    { "source": "User", "predicate": "lives_in", "target": "Tokyo", "confidence": 0.9 }
  ]
}`;

export function buildExtractionUserPrompt(
  userMessage: string,
  assistantMessage: string,
): string {
  return `Latest exchange:
User: ${userMessage}
Assistant: ${assistantMessage}

Extract personal facts about the user from this exchange.`;
}

export const SUMMARIZATION_PROMPT = `You are a memory compression engine. Given a list of facts about a user, compress them into a concise natural-language paragraph. Preserve ALL key information — names, places, preferences, relationships, dates. Do not add information that is not in the facts. Write in second person ("You live in Tokyo" not "The user lives in Tokyo").`;

export function buildSummarizationUserPrompt(facts: string[]): string {
  return `Known facts:\n${facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\nCompress into a single concise paragraph.`;
}

export const INCREMENTAL_SUMMARIZATION_PROMPT = `You update a long-term memory summary.

Rules:
- Keep the prior summary's durable details unless contradicted by new facts.
- Integrate new facts naturally into one coherent paragraph.
- If a new fact conflicts with the prior summary, prefer the new fact.
- Preserve concrete entities (names, places, relationships, dates, preferences).
- Do not invent new facts.
- Write in second person.`;

export function buildIncrementalSummarizationUserPrompt(
  currentSummary: string,
  newFacts: string[],
): string {
  return `Current summary:\n${currentSummary}\n\nNew facts since the last summary update:\n${newFacts
    .map((fact, index) => `${index + 1}. ${fact}`)
    .join("\n")}\n\nReturn an updated single paragraph summary.`;
}

export const CONVERSATION_SUMMARIZATION_PROMPT = `You are a memory compression engine.

Given a rolling conversation transcript, write a concise long-term memory summary focused on durable user-relevant details (identity, relationships, preferences, constraints, goals, ongoing situations, and explicit corrections).

Rules:
- Preserve concrete details (names, places, dates, preferences, relationship context) when present.
- Prefer current facts when the transcript contains corrections.
- Do not include transient chit-chat or stylistic filler.
- Do not invent facts.
- Write in second person.
- Return a single paragraph.`;

export function buildConversationSummarizationUserPrompt(transcript: string): string {
  return `Conversation transcript (rolling window):\n${transcript}\n\nCompress this into a single long-term memory paragraph.`;
}

export const INCREMENTAL_CONVERSATION_SUMMARIZATION_PROMPT = `You update an existing long-term memory summary using new conversation messages.

Rules:
- Keep valid durable details from the prior summary.
- Integrate new reliable details from recent messages.
- If recent messages contradict prior summary, prefer recent messages.
- Do not invent facts.
- Write in second person.
- Return a single paragraph.`;

export function buildIncrementalConversationSummarizationUserPrompt(
  currentSummary: string,
  transcript: string,
): string {
  return `Current long-term summary:\n${currentSummary}\n\nRecent conversation messages:\n${transcript}\n\nReturn the updated single paragraph summary.`;
}
