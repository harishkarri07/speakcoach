import { z } from 'zod';
import { COACHING_MODES, TECHNICAL_DOMAINS } from '../src/types/database';

/**
 * Chat request validation.
 *
 * The client may NEVER supply a system prompt: `systemInstruction` is not a
 * known key and `z.strictObject` rejects any body that contains it.
 * History roles are limited to the two roles the coach actually replays.
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1).max(4000),
});

export const ChatRequestSchema = z.strictObject({
  message: z.string().min(1).max(4000),
  history: z.array(ChatMessageSchema).max(50).default([]),
  mode: z.enum(COACHING_MODES).default('free_talk'),
  technicalDomain: z.enum(TECHNICAL_DOMAINS).default('soc_ir'),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
