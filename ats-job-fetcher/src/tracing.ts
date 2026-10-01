/**
 * OpenTelemetry SDK bootstrap for ats-job-fetcher.
 *
 * Import this as the FIRST statement in index.ts.
 * Tracing is opt-in: set OTEL_ENABLED=true to activate.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const OTEL_ENABLED = process.env.OTEL_ENABLED === 'true';
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4317';
const SERVICE_VERSION = process.env.npm_package_version ?? '1.0.0';

let sdk: NodeSDK | null = null;

if (OTEL_ENABLED) {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'ats-job-fetcher',
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
    'deployment.environment': process.env.NODE_ENV ?? 'production',
  });

  const traceExporter = new OTLPTraceExporter({ url: OTEL_ENDPOINT });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log(`[OTel] ats-job-fetcher tracing enabled → ${OTEL_ENDPOINT}`);

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
