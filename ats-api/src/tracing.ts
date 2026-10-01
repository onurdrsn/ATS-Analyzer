/**
 * OpenTelemetry SDK bootstrap for ats-api.
 *
 * Must be imported BEFORE any other module (use --import flag or
 * place this as the very first import in index.ts).
 *
 * Tracing is disabled when OTEL_ENABLED != "true" so self-hosted
 * deployments are private-by-default.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const OTEL_ENABLED = process.env.OTEL_ENABLED === 'true';
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4317';
const SERVICE_VERSION = process.env.npm_package_version ?? '1.0.0';

let sdk: NodeSDK | null = null;

if (OTEL_ENABLED) {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'ats-api',
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
    'deployment.environment': process.env.NODE_ENV ?? 'production',
  });

  const traceExporter = new OTLPTraceExporter({ url: `${OTEL_ENDPOINT}` });
  const metricExporter = new OTLPMetricExporter({ url: `${OTEL_ENDPOINT}` });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy fs instrumentation
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log(`[OTel] Tracing enabled → ${OTEL_ENDPOINT}`);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk!.shutdown()
      .then(() => console.log('[OTel] SDK shut down cleanly'))
      .catch((err) => console.error('[OTel] Shutdown error', err))
      .finally(() => process.exit(0));
  });
} else {
  console.log('[OTel] Tracing disabled (set OTEL_ENABLED=true to enable)');
}

export { sdk };
