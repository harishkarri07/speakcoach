# SpeakCoach Threat Model & Security Architecture

SpeakCoach is designed for a single user (a 3rd-year cybersecurity student) who values defense-in-depth, data sovereignty, and strict API safety.

---

## 1. Threat Model & Assets

### Protected Assets
1. **Gemini API Key**: Grants quota and billing access to Google Gemini models. Must never be exposed to the client or browser network inspection.
2. **User Voice Audio & Transcripts**: Highly sensitive biometric/conversational data containing practice responses, personal thoughts, and interview mock answers.
3. **Database Records**: Profile information, streak counts, session summaries, performance scores.

### Adversaries & Attack Vectors
- **Client-Side Exfiltration**: Inspecting client bundle, network tab, or dev tools to extract backend keys.
- **Untrusted Model Output Injection (XSS)**: Malicious or hallucinated HTML/script tags from language model streaming.
- **Unauthorized Data Access (BOLA / IDOR)**: Requesting another user's session transcripts, scores, or settings.
- **API Abuse / Denial of Service**: Flooding streaming chat or ephemeral token endpoints with high-volume automated requests.
- **Microphone / Media Hijacking**: Unintended background audio listening or unauthorized audio recording storage.

---

## 2. Mitigations & Defense-in-Depth

| Threat | Mitigation Architecture |
|---|---|
| **Gemini API Key Leakage** | The Gemini API key (`GEMINI_API_KEY`) is stored strictly in server-side environment variables. It is never exposed in client bundles (`VITE_` variables do not include it). For Live voice interactions, only short-lived ephemeral tokens are issued or proxied through the authenticated server. |
| **Model Output Injection (XSS)** | All LLM responses are treated as untrusted text. Responses are parsed defensively and rendered exclusively through plain-text nodes or sanitized text formatters—never using `dangerouslySetInnerHTML`. Analysis JSON is validated against strict Zod schemas before consumption. |
| **Unauthorized DB Access** | Supabase Postgres enforces Row Level Security (RLS) on 100% of tables (`profiles`, `sessions`, `messages`, `streaks`, `rewards`, `reward_wallet`, `daily_plan`, `settings`). Every query checks `auth.uid() = user_id`. |
| **Transcript & Audio Privacy** | By default, **audio recording storage is turned OFF (`store_audio: false`)**. No audio data is persisted without explicit user opt-in in settings. No transcripts are logged to server console or third-party analytical trackers. |
| **Rate Limiting & DoS Defense** | Server API endpoints (`/api/chat/stream`, `/api/session/*`) enforce IP and user-rate limiting with exponential backoff on abuse. |
| **Input Validation & Sanitization** | All incoming request bodies are validated on the server using `zod` schemas before executing any Gemini API call or database interaction. |

---

## 3. Ephemeral Live Voice Architecture
1. Client requests an active voice session through an authenticated server endpoint.
2. The server verifies the Supabase session token or authentication header.
3. Audio is piped directly over a secure WebSocket using 16kHz PCM (inbound) and 24kHz PCM (outbound).
4. Audio buffers are streamed in real time and discarded from memory immediately after transcription and response synthesis.
