import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

type ResultCallback = Parameters<SpanExporter["export"]>[1];

/**
 * Wraps a span exporter and strips secrets from URLs before anything leaves
 * the process. Auto-instrumented fetch spans put the full URL in the span name
 * and in http.url / url.full, and some APIs (FMP: `?apikey=`) take their key
 * as a query parameter.
 *
 * Redacts the value of any query parameter whose name looks sensitive.
 */
const SENSITIVE = /([?&][^=&#\s]*(?:key|token|secret|password|passwd|sig|signature|auth|credential)[^=&#\s]*=)[^&#\s]*/gi;

export function redactUrl(value: string): string {
  return value.replace(SENSITIVE, "$1REDACTED");
}

function sanitize(span: ReadableSpan): ReadableSpan {
  const name = redactUrl(span.name);
  let attributes = span.attributes;
  // Every string attribute: URLs show up under http.url, url.full, resource.name, operation.name, ...
  for (const [k, v] of Object.entries(attributes)) {
    if (typeof v === "string" && v.includes("=")) {
      const r = redactUrl(v);
      if (r !== v) attributes = { ...attributes, [k]: r };
    }
  }
  if (name === span.name && attributes === span.attributes) return span;
  // Keep the original as prototype so methods like spanContext() still work.
  return Object.create(span, {
    name: { value: name, enumerable: true },
    attributes: { value: attributes, enumerable: true },
  }) as ReadableSpan;
}

export class RedactingSpanExporter implements SpanExporter {
  constructor(private readonly inner: SpanExporter) {}

  export(spans: ReadableSpan[], resultCallback: ResultCallback): void {
    this.inner.export(spans.map(sanitize), resultCallback);
  }

  shutdown(): Promise<void> {
    return this.inner.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.inner.forceFlush?.() ?? Promise.resolve();
  }
}
