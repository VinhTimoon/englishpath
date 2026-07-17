import type {
  AnalyticsPort,
  MonitoringPort,
  StructuredLoggerPort,
} from './observability.ports';
import {
  deepFreeze,
  normalizeAnalyticsEvent,
  normalizeMetricMeasurement,
  normalizeStructuredLogEvent,
  type AnalyticsEvent,
  type MetricMeasurement,
  type StructuredLogEvent,
} from './observability.models';

function snapshot<T>(events: readonly T[]): readonly T[] {
  return deepFreeze([...events]);
}

export class LocalStructuredLogCollector implements StructuredLoggerPort {
  private readonly events: StructuredLogEvent[] = [];

  log(event: StructuredLogEvent): void {
    this.events.push(normalizeStructuredLogEvent(event));
  }

  getEvents(): readonly StructuredLogEvent[] {
    return snapshot(this.events);
  }
}

export class LocalMonitoringCollector implements MonitoringPort {
  private readonly events: MetricMeasurement[] = [];

  record(event: MetricMeasurement): void {
    this.events.push(normalizeMetricMeasurement(event));
  }

  getEvents(): readonly MetricMeasurement[] {
    return snapshot(this.events);
  }
}

export class LocalAnalyticsCollector implements AnalyticsPort {
  private readonly events: AnalyticsEvent[] = [];

  track(event: AnalyticsEvent): void {
    this.events.push(normalizeAnalyticsEvent(event));
  }

  getEvents(): readonly AnalyticsEvent[] {
    return snapshot(this.events);
  }
}
