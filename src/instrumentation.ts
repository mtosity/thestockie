import type { Instrumentation } from "next";
import { OTLPHttpProtoTraceExporter, registerOTel } from "@vercel/otel";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { RedactingSpanExporter } from "./lib/redact-exporter";

/**
 * Sends server-side traces (route handlers, server components, tRPC, outgoing
 * fetches to Convex / FMP / DeepSeek, ...) and logs (src/lib/telemetry.ts) to
 * our self-hosted SigNoz.
 *
 * Only active when OTEL_EXPORTER_OTLP_ENDPOINT is set (Vercel production).
 * The endpoint is otel.mtosity.com behind Cloudflare Access, so requests carry
 * a Cloudflare service token (CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET).
 */
export async function register() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, "");
  if (!endpoint) return;

  const headers: Record<string, string> = {};
  if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET;
  }

  // Log export only in the Node.js runtime (the OTLP log exporter isn't edge-safe).
  const logRecordProcessors = [];
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { OTLPLogExporter } = await import("@opentelemetry/exporter-logs-otlp-http");
    const { BatchLogRecordProcessor } = await import("@opentelemetry/sdk-logs");
    logRecordProcessors.push(
      new BatchLogRecordProcessor({ exporter: new OTLPLogExporter({ url: `${endpoint}/v1/logs`, headers }) }),
    );
  }

  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "thestockie",
    attributes: {
      "deployment.environment": process.env.VERCEL_ENV ?? "development",
      "host.name": "vercel",
      "service.version": process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    // One explicit processor: secrets in URLs (e.g. FMP `?apikey=`) are redacted
    // before export. Passing spanProcessors also stops @vercel/otel's "auto" mode
    // from adding a second, unredacted exporter off OTEL_EXPORTER_OTLP_ENDPOINT.
    spanProcessors: [
      new BatchSpanProcessor(
        new RedactingSpanExporter(new OTLPHttpProtoTraceExporter({ url: `${endpoint}/v1/traces`, headers })),
      ),
    ],
    logRecordProcessors,
  });
}

/**
 * Called by Next.js for every uncaught server error (server components, route
 * handlers, server actions, middleware). Logged with route context and linked
 * to the active trace, so a 500 shows up in SigNoz with its stack trace.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { logger } = await import("./lib/telemetry");
  const e = err as Error & { digest?: string };
  logger.error(
    "unhandled server error",
    {
      "http.request.method": request.method,
      "url.path": request.path.split("?")[0] ?? request.path,
      "next.route": context.routePath,
      "next.route_type": context.routeType,
      "next.render_source": context.renderSource ?? "",
      "next.error_digest": e.digest ?? "",
    },
    err,
  );
};
