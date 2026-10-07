import { describe, it, expect } from 'vitest';
import { readSSE, type SSEEvent } from '../src/lib/sse';

function createMockResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let index = 0;

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('readSSE', () => {
  it('correctly reassembles chunks split mid-line and processes server error events', async () => {
    // Chunks split arbitrarily across tokens, JSON boundaries, and lines
    const mockChunks = [
      'da',
      'ta: {"text":',
      ' "Hello student, welcome',
      ' to practice!"}\n\n',
      // Chunk split mid-line for error event
      'data: {"error":',
      ' "Upstream rate limit',
      ' reached", "code": "RATE_LIMIT"}\n',
      '\n',
      'data: [DONE]\n\n',
    ];

    const response = createMockResponse(mockChunks);
    const events: SSEEvent[] = [];

    for await (const event of readSSE(response)) {
      events.push(event);
    }

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      text: 'Hello student, welcome to practice!',
    });
    expect(events[1]).toEqual({
      error: 'Upstream rate limit reached',
      code: 'RATE_LIMIT',
    });
  });

  it('stops reading cleanly when aborted', async () => {
    const mockChunks = [
      'data: {"text": "chunk1"}\n\n',
      'data: {"text": "chunk2"}\n\n',
    ];

    const controller = new AbortController();
    const response = createMockResponse(mockChunks);
    const events: SSEEvent[] = [];

    for await (const event of readSSE(response, controller.signal)) {
      events.push(event);
      controller.abort();
    }

    expect(events).toHaveLength(1);
  });
});
