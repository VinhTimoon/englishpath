import type {
  AnalyticsEvent,
  MetricMeasurement,
  StructuredLogEvent,
} from './observability.models';

export interface StructuredLoggerPort {
  log(event: StructuredLogEvent): void;
}

export interface MonitoringPort {
  record(event: MetricMeasurement): void;
}

export interface AnalyticsPort {
  track(event: AnalyticsEvent): void;
}
