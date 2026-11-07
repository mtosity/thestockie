import { SeverityNumber, logs } from "@opentelemetry/api-logs";
import { SpanStatusCode, trace, type Attributes, type Span } from "@opentelemetry/api";

/**
 * Structured logging + tracing helpers for SigNoz.
 *
 * - `logger.*` emits an OpenTelemetry log record (exported by instrumentation.ts)
 *   carrying the active trace/span ids, so a log line links straight to its
 *   trace in SigNoz. It still prints to the console for local dev / Vercel logs.
 * - Pass context as structured attributes, not string interpolation, so it can
 *   be filtered on (e.g. `logger.error("fmp request failed", { "fmp.endpoint": e })`).
 * - Never log secrets or personal data (tokens, emails, full request bodies).
 */
const otelLogger = logs.getLogger("thestockie");

type Level = "debug" | "info" | "warn" | "error";
const severity: Record<Level, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

function errorAttributes(err: unknown): Attributes {
  if (err instanceof Error) {
    return {
      "exception.type": err.name,
      "exception.message": err.message,
      "exception.stacktrace": err.stack ?? "",
    };
  }
  return err === undefined ? {} : { "exception.message": String(err) };
}

/**
 * Serverless functions freeze as soon as the response is sent, so a batched
 * log can be lost. Flush after each log and ask Vercel to wait for it
 * (the same request-context hook @vercel/functions' waitUntil uses; a no-op
 * outside Vercel).
 */
type Flushable = { forceFlush?: () => Promise<void>; getDelegate?: () => Flushable };
function flushSoon() {
  try {
    const provider = logs.getLoggerProvider() as unknown as Flushable;
    const real = provider.getDelegate?.() ?? provider;
    const p = real.forceFlush?.();
    if (!p) return;
    const ctx = (globalThis as Record<symbol, { get?: () => { waitUntil?: (p: Promise<unknown>) => void } } | undefined>)[
      Symbol.for("@vercel/request-context")
    ]?.get?.();
    ctx?.waitUntil?.(p.catch(() => undefined));
  } catch {
    // never let telemetry break a request
  }
}

function emit(level: Level, message: string, attributes: Attributes = {}, err?: unknown) {
  const attrs = { ...attributes, ...errorAttributes(err) };
  try {
    otelLogger.emit({
      severityNumber: severity[level],
      severityText: level.toUpperCase(),
      body: message,
      attributes: attrs,
    });
    flushSoon();
  } catch {
    // telemetry must never break a request
  }
  const line = Object.keys(attrs).length ? [message, attrs] : [message];
  // eslint-disable-next-line no-console
  (level === "debug" ? console.debug : console[level])(...line);
}

export const logger = {
  debug: (msg: string, attrs?: Attributes) => emit("debug", msg, attrs),
  info: (msg: string, attrs?: Attributes) => emit("info", msg, attrs),
  warn: (msg: string, attrs?: Attributes, err?: unknown) => emit("warn", msg, attrs, err),
  error: (msg: string, attrs?: Attributes, err?: unknown) => emit("error", msg, attrs, err),
};

/** Record an exception on a span and mark it failed (OTel convention). */
export function recordError(span: Span, err: unknown) {
  if (err instanceof Error) span.recordException(err);
  else span.recordException({ message: String(err) });
  span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
}

export const tracer = trace.getTracer("thestockie");
