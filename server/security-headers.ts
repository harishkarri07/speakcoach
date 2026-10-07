import helmet from 'helmet';

export interface SecurityHeaderOptions {
  /** true when NODE_ENV === 'production' */
  isProd: boolean;
  /** Supabase project URL (https://…). Added to CSP connect-src in production. */
  supabaseUrl?: string;
}

/**
 * Dev vs production headers:
 * - Dev: CSP and HSTS are OFF — Vite injects an inline React-refresh preamble
 *   script and serves HMR over a websocket, so helmet's strict
 *   `script-src 'self'` would block both and the page would render blank.
 * - Production: strict CSP (scripts/styles from 'self' only, frame-ancestors
 *   'none', connect-src 'self' + Supabase https/wss) with HSTS enabled.
 *   The built app ships no inline <script>/<style> (see dist/index.html), so
 *   'unsafe-inline' is not needed for scripts or styles.
 */
export function createSecurityHeaders({ isProd, supabaseUrl }: SecurityHeaderOptions) {
  if (!isProd) {
    return helmet({
      contentSecurityPolicy: false,
      hsts: false,
      crossOriginEmbedderPolicy: false,
    });
  }

  const connectSrc = ["'self'"];
  if (supabaseUrl) {
    // Same host for REST/auth plus its WebSocket (realtime) form:
    // https://x.supabase.co -> wss://x.supabase.co (http -> ws).
    connectSrc.push(supabaseUrl, supabaseUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://'));
  }

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc,
        workerSrc: ["'self'", 'blob:'],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
}
