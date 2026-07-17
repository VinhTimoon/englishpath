import type {
  AnalyticsPort,
  MonitoringPort,
  StructuredLoggerPort,
} from './observability.ports';
import {
  normalizeAnalyticsEvent,
  normalizeMetricMeasurement,
  normalizeStructuredLogEvent,
  type AnalyticsEvent,
  type MetricMeasurement,
  type StructuredLogEvent,
} from './observability.models';

export class NoopStructuredLogger implements StructuredLoggerPort {
  log(event: StructuredLogEvent): void {
    normalizeStructuredLogEvent(event);
  }
}

export class NoopMonitoringAdapter implements MonitoringPort {
  record(event: MetricMeasurement): void {
    normalizeMetricMeasurement(event);
  }
}

export class NoopAnalyticsAdapter implements AnalyticsPort {
  track(event: AnalyticsEvent): void {
    normalizeAnalyticsEvent(event);
  }
}
