import {
  LocalAnalyticsCollector,
  LocalMonitoringCollector,
  LocalStructuredLogCollector,
} from './local-observability-collectors';
import {
  NoopAnalyticsAdapter,
  NoopMonitoringAdapter,
  NoopStructuredLogger,
} from './noop-observability.adapters';
import { ObservabilityError } from './observability.error';
import {
  normalizeAnalyticsEvent,
  normalizeMetricMeasurement,
  normalizeStructuredLogEvent,
  type StructuredLogEvent,
} from './observability.models';
import * as publicApi from './index';

const timestamp = '2026-07-17T00:00:00.000Z';
const correlation = { correlationId: 'corr-00000001' };

describe('local and no-op observability adapters', () => {
  it('collects copied, redacted events in deterministic append order', () => {
    const attributes: Record<string, string> = {
      routeTemplate: '/first',
      authorization: 'Bearer secret',
    };
    const first = {
      name: 'api.first',
      timestamp,
      correlation,
      severity: 'info',
      attributes,
    } as StructuredLogEvent;
    const collector = new LocalStructuredLogCollector();

    collector.log(first);
    attributes.routeTemplate = '/mutated';
    collector.log(
      normalizeStructuredLogEvent({
        name: 'api.second',
        timestamp,
        correlation,
        severity: 'warn',
      }),
    );

    const events = collector.getEvents();
    expect(events.map((event) => event.name)).toEqual([
      'api.first',
      'api.second',
    ]);
    expect(events[0].attributes).toEqual({ routeTemplate: '/first' });
    expect(JSON.stringify(events)).not.toContain('Bearer secret');
    expect(Object.isFrozen(events)).toBe(true);
    expect(Object.isFrozen(events[0])).toBe(true);
    expect(Object.isFrozen(events[0].correlation)).toBe(true);
    expect(() => {
      (events[0].correlation as { correlationId: string }).correlationId =
        'mutated-0001';
    }).toThrow(TypeError);
  });

  it('returns frozen snapshots isolated from later collector writes', () => {
    const collector = new LocalAnalyticsCollector();
    collector.track(
      normalizeAnalyticsEvent({
        name: 'guest.started',
        timestamp,
        correlation,
      }),
    );
    const firstSnapshot = collector.getEvents();
    collector.track(
      normalizeAnalyticsEvent({
        name: 'guest.completed',
        timestamp,
        correlation,
      }),
    );

    expect(firstSnapshot).toHaveLength(1);
    expect(collector.getEvents()).toHaveLength(2);
    expect(() => {
      (firstSnapshot as unknown[]).push('mutated');
    }).toThrow(TypeError);
  });

  it('validates and stores monitoring measurements', () => {
    const collector = new LocalMonitoringCollector();
    collector.record(
      normalizeMetricMeasurement({
        name: 'api.latency',
        timestamp,
        correlation,
        kind: 'histogram',
        unit: 'milliseconds',
        value: 25,
      }),
    );
    expect(collector.getEvents()).toEqual([
      expect.objectContaining({ name: 'api.latency', value: 25 }),
    ]);
  });

  it('defensively copies monitoring and analytics attributes', () => {
    const metricAttributes = {
      routeTemplate: '/metric',
      answer: 'private answer',
    };
    const analyticsAttributes = {
      source: 'landing',
      path: 'private/location',
    };
    const monitoring = new LocalMonitoringCollector();
    const analytics = new LocalAnalyticsCollector();

    monitoring.record({
      name: 'api.latency',
      timestamp,
      correlation,
      kind: 'histogram',
      unit: 'milliseconds',
      value: 12,
      attributes: metricAttributes,
    });
    analytics.track({
      name: 'guest.started',
      timestamp,
      correlation,
      attributes: analyticsAttributes,
    });
    metricAttributes.routeTemplate = '/mutated';
    analyticsAttributes.source = 'mutated';

    expect(monitoring.getEvents()[0].attributes).toEqual({
      routeTemplate: '/metric',
    });
    expect(analytics.getEvents()[0].attributes).toEqual({ source: 'landing' });
    expect(Object.isFrozen(monitoring.getEvents()[0].attributes)).toBe(true);
    expect(Object.isFrozen(analytics.getEvents()[0].attributes)).toBe(true);
  });

  it('no-op adapters validate then discard events without retained state', () => {
    const logger = new NoopStructuredLogger();
    const monitoring = new NoopMonitoringAdapter();
    const analytics = new NoopAnalyticsAdapter();

    logger.log(
      normalizeStructuredLogEvent({
        name: 'api.request',
        timestamp,
        correlation,
        severity: 'debug',
      }),
    );
    monitoring.record(
      normalizeMetricMeasurement({
        name: 'queue.length',
        timestamp,
        correlation,
        kind: 'gauge',
        unit: 'count',
        value: 0,
      }),
    );
    analytics.track(
      normalizeAnalyticsEvent({
        name: 'learner.active',
        timestamp,
        correlation,
      }),
    );

    for (const adapter of [logger, monitoring, analytics]) {
      expect(Object.keys(adapter)).toEqual([]);
    }
    expect(() => logger.log({} as never)).toThrow(ObservabilityError);
  });

  it('exports no provider, network, console, persistence, or audit adapter', () => {
    for (const key of [
      'PostHogAdapter',
      'SentryAdapter',
      'ConsoleLogger',
      'AuditRepository',
      'sendTelemetry',
    ]) {
      expect(key in publicApi).toBe(false);
    }
  });

  it('performs no console or network I/O', () => {
    const consoleSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Network must not be called.'));
    try {
      const logger = new LocalStructuredLogCollector();
      logger.log(
        normalizeStructuredLogEvent({
          name: 'api.request',
          timestamp,
          correlation,
          severity: 'info',
        }),
      );
      new NoopAnalyticsAdapter().track(
        normalizeAnalyticsEvent({
          name: 'guest.started',
          timestamp,
          correlation,
        }),
      );

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
      fetchSpy.mockRestore();
    }
  });
});
