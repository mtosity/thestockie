import { OTLPHttpProtoTraceExporter, registerOTel } from "@vercel/otel";

/**
 * Sends server-side traces (route handlers, server components, tRPC, outgoing
 * fetches to Convex / FMP / DeepSeek, ...) to our self-hosted SigNoz.
 *
 * Only active when OTEL_EXPORTER_OTLP_ENDPOINT is set (Vercel production).
 * The endpoint is otel.mtosity.com behind Cloudflare Access, so requests carry
 * a Cloudflare service token (CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET).
 */
export function register() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  const headers: Record<string, string> = {};
  if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET;
  }

  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "thestockie",
    attributes: {
      "deployment.environment": process.env.VERCEL_ENV ?? "development",
      "host.name": "vercel",
    },
    traceExporter: new OTLPHttpProtoTraceExporter({
      url: `${endpoint.replace(/\/$/, "")}/v1/traces`,
      headers,
    }),
  });
}
