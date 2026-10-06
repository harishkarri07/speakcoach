export interface SSEEvent {
  [key: string]: unknown;
}

interface ParsedBlock {
  done: boolean;
  event: SSEEvent | null;
}

function parseBlock(block: string): ParsedBlock {
  let done = false;
  let event: SSEEvent | null = null;

  for (const line of block.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') {
      done = true;
      continue;
    }
    if (!payload || event) continue;
    try {
      event = JSON.parse(payload) as SSEEvent;
    } catch {
      // Incomplete or malformed payload: skip it and keep streaming.
    }
  }

  return { done, event };
}

/**
 * Reads a `text/event-stream` body and yields each parsed `data:` payload.
 * Partial lines are buffered across network chunks, and `[DONE]` terminates
 * the whole stream (not just the current event batch).
 */
export async function* readSSE(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent, void, void> {
  if (!response.body) {
    throw new Error('Streaming is not supported in this browser.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) return;

      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        const parsed = parseBlock(block);
        if (parsed.event) yield parsed.event;
        if (parsed.done) return;

        separatorIndex = buffer.indexOf('\n\n');
      }
    }

    if (buffer.trim()) {
      const parsed = parseBlock(buffer);
      if (parsed.event) yield parsed.event;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // The stream may already be closed or errored.
    }
  }
}
