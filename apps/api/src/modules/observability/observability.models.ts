import {
  OBSERVABILITY_ERROR_CODES,
  ObservabilityError,
} from './observability.error';

export const LOG_SEVERITIES = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
] as const;
export const METRIC_KINDS = ['counter', 'gauge', 'histogram'] as const;
export const METRIC_UNITS = [
  'count',
  'milliseconds',
  'seconds',
  'bytes',
  'percent',
  'ratio',
] as const;

export type LogSeverity = (typeof LOG_SEVERITIES)[number];
export type MetricKind = (typeof METRIC_KINDS)[number];
export type MetricUnit = (typeof METRIC_UNITS)[number];
export type BoundedAttributeValue = string | number | boolean | null;
export type BoundedAttributes = Readonly<Record<string, BoundedAttributeValue>>;
export type CorrelationContext = Readonly<{ correlationId: string }>;

type EventBase = Readonly<{
  name: string;
  timestamp: string;
  correlation: CorrelationContext;
  attributes: BoundedAttributes;
}>;

export type StructuredLogEvent = EventBase &
  Readonly<{ severity: LogSeverity }>;
export type MetricMeasurement = EventBase &
  Readonly<{ kind: MetricKind; unit: MetricUnit; value: number }>;
export type AnalyticsEvent = EventBase;

export type ObservabilityDependencies = Readonly<{
  clock: () => Date;
  correlationIdGenerator: () => string;
}>;

export type EventInput = Readonly<{
  name: unknown;
  timestamp?: unknown;
  correlation: unknown;
  attributes?: unknown;
}>;
export type StructuredLogEventInput = EventInput &
  Readonly<{ severity: unknown }>;
export type MetricMeasurementInput = EventInput &
  Readonly<{ kind: unknown; unit: unknown; value: unknown }>;

const NAME_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const ATTRIBUTE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const MAX_ATTRIBUTES = 32;
const MAX_ATTRIBUTE_STRING_LENGTH = 256;
const BASE_EVENT_FIELDS = new Set([
  'name',
  'timestamp',
  'correlation',
  'attributes',
]);
const LOG_EVENT_FIELDS = new Set([...BASE_EVENT_FIELDS, 'severity']);
const METRIC_EVENT_FIELDS = new Set([
  ...BASE_EVENT_FIELDS,
  'kind',
  'unit',
  'value',
]);
const SENSITIVE_KEY_PARTS = [
  'authorization',
  'credential',
  'cookie',
  'password',
  'secret',
  'token',
  'apikey',
  'userid',
  'useridentifier',
  'correctanswer',
  'privateanswer',
  'providerpayload',
  'providersresponse',
  'privatesource',
  'sourcelocation',
  'sourcepath',
  'payment',
  'email',
  'phone',
  'name',
  'identity',
  'location',
  'providerresponse',
  'fullname',
  'displayname',
  'rawtext',
  'freetext',
  'message',
  'answer',
  'path',
] as const;
const SAFE_TOKEN_ATTRIBUTE_KEYS = new Set([
  'outcome',
  'errorCode',
  'feature',
  'source',
  'resourceType',
  'adapter',
  'operation',
]);
const SAFE_ATTRIBUTE_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const SAFE_ROUTE_TEMPLATE_PATTERN = /^\/[A-Za-z0-9_:/.-]{1,127}$/;
const HTTP_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

export function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function invalidEvent(): never {
  throw new ObservabilityError(OBSERVABILITY_ERROR_CODES.INVALID_EVENT);
}

function requirePlainObject(
  value: unknown,
  code: ObservabilityError['code'] = OBSERVABILITY_ERROR_CODES.INVALID_EVENT,
): Record<string, unknown> {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ObservabilityError(code);
    }
    const prototype = Object.getPrototypeOf(value) as unknown;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ObservabilityError(code);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const snapshot: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!('value' in descriptor)) {
        throw new ObservabilityError(code);
      }
      snapshot[key] = descriptor.value as unknown;
    }
    return snapshot;
  } catch (error: unknown) {
    if (error instanceof ObservabilityError) {
      throw error;
    }
    throw new ObservabilityError(code);
  }
}

function requireName(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > 96 ||
    !NAME_PATTERN.test(value)
  ) {
    return invalidEvent();
  }
  return value;
}

function requireAllowedFields(
  input: Record<string, unknown>,
  allowed: ReadonlySet<string>,
) {
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    return invalidEvent();
  }
}

function requireTimestamp(value: unknown): string {
  if (typeof value !== 'string') {
    return invalidEvent();
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    return invalidEvent();
  }
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) {
    return invalidEvent();
  }
  return value;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

function isSensitiveStringValue(value: string): boolean {
  const normalized = value.trim();
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ||
    /^\+?\d[\d\s().-]{7,20}$/.test(normalized) ||
    /^(?:bearer\s+|sk[-_]|api[_-]?key\s*[:=]|token\s*[:=]|secret\s*[:=])/i.test(
      normalized,
    )
  );
}

function isAllowedStringAttribute(key: string, value: string): boolean {
  if (key === 'routeTemplate') {
    return SAFE_ROUTE_TEMPLATE_PATTERN.test(value);
  }
  if (key === 'httpMethod') {
    return HTTP_METHODS.has(value);
  }
  return (
    SAFE_TOKEN_ATTRIBUTE_KEYS.has(key) &&
    SAFE_ATTRIBUTE_TOKEN_PATTERN.test(value)
  );
}

export function redactAndValidateAttributes(
  value: unknown = {},
): BoundedAttributes {
  const input = requirePlainObject(
    value,
    OBSERVABILITY_ERROR_CODES.INVALID_ATTRIBUTES,
  );
  const entries = Object.entries(input);
  if (entries.length > MAX_ATTRIBUTES) {
    throw new ObservabilityError(OBSERVABILITY_ERROR_CODES.INVALID_ATTRIBUTES);
  }

  const attributes: Record<string, BoundedAttributeValue> = {};
  for (const [key, attributeValue] of entries) {
    if (!ATTRIBUTE_KEY_PATTERN.test(key)) {
      throw new ObservabilityError(
        OBSERVABILITY_ERROR_CODES.INVALID_ATTRIBUTES,
      );
    }
    if (
      attributeValue !== null &&
      typeof attributeValue !== 'string' &&
      typeof attributeValue !== 'number' &&
      typeof attributeValue !== 'boolean'
    ) {
      throw new ObservabilityError(
        OBSERVABILITY_ERROR_CODES.INVALID_ATTRIBUTES,
      );
    }
    if (
      (typeof attributeValue === 'number' &&
        !Number.isFinite(attributeValue)) ||
      (typeof attributeValue === 'string' &&
        attributeValue.length > MAX_ATTRIBUTE_STRING_LENGTH)
    ) {
      throw new ObservabilityError(
        OBSERVABILITY_ERROR_CODES.INVALID_ATTRIBUTES,
      );
    }
    if (
      isSensitiveKey(key) ||
      (typeof attributeValue === 'string' &&
        (isSensitiveStringValue(attributeValue) ||
          !isAllowedStringAttribute(key, attributeValue)))
    ) {
      continue;
    }
    attributes[key] = attributeValue;
  }
  return deepFreeze(attributes);
}

export function createCorrelationContext(
  acceptedId: unknown,
  generateId: () => string,
): CorrelationContext {
  let candidate = acceptedId;
  if (candidate === undefined) {
    if (typeof generateId !== 'function') {
      throw new ObservabilityError(
        OBSERVABILITY_ERROR_CODES.INVALID_CORRELATION,
      );
    }
    try {
      candidate = generateId();
    } catch {
      throw new ObservabilityError(
        OBSERVABILITY_ERROR_CODES.INVALID_CORRELATION,
      );
    }
  }
  if (
    typeof candidate !== 'string' ||
    !CORRELATION_ID_PATTERN.test(candidate)
  ) {
    throw new ObservabilityError(OBSERVABILITY_ERROR_CODES.INVALID_CORRELATION);
  }
  return deepFreeze({ correlationId: candidate });
}

export function validateCorrelationContext(value: unknown): CorrelationContext {
  const input = requirePlainObject(value);
  if (
    Object.keys(input).length !== 1 ||
    typeof input.correlationId !== 'string' ||
    !CORRELATION_ID_PATTERN.test(input.correlationId)
  ) {
    throw new ObservabilityError(OBSERVABILITY_ERROR_CODES.INVALID_CORRELATION);
  }
  return deepFreeze({ correlationId: input.correlationId });
}

function normalizeBase(
  inputValue: unknown,
  allowedFields: ReadonlySet<string>,
  clock?: () => Date,
): EventBase {
  const input = requirePlainObject(inputValue);
  requireAllowedFields(input, allowedFields);
  let timestamp = input.timestamp;
  if (timestamp === undefined) {
    if (typeof clock !== 'function') {
      return invalidEvent();
    }
    try {
      const clockValue = clock();
      if (!(clockValue instanceof Date)) {
        return invalidEvent();
      }
      timestamp = clockValue.toISOString();
    } catch {
      return invalidEvent();
    }
  }
  return {
    name: requireName(input.name),
    timestamp: requireTimestamp(timestamp),
    correlation: validateCorrelationContext(input.correlation),
    attributes: redactAndValidateAttributes(
      input.attributes === undefined ? {} : input.attributes,
    ),
  };
}

export function normalizeStructuredLogEvent(
  inputValue: unknown,
  clock?: () => Date,
): StructuredLogEvent {
  const input = requirePlainObject(inputValue);
  const base = normalizeBase(input, LOG_EVENT_FIELDS, clock);
  if (!LOG_SEVERITIES.includes(input.severity as never)) {
    return invalidEvent();
  }
  return deepFreeze({ ...base, severity: input.severity as LogSeverity });
}

export function normalizeMetricMeasurement(
  inputValue: unknown,
  clock?: () => Date,
): MetricMeasurement {
  const input = requirePlainObject(inputValue);
  const base = normalizeBase(input, METRIC_EVENT_FIELDS, clock);
  if (
    !METRIC_KINDS.includes(input.kind as never) ||
    !METRIC_UNITS.includes(input.unit as never) ||
    typeof input.value !== 'number' ||
    !Number.isFinite(input.value)
  ) {
    return invalidEvent();
  }
  return deepFreeze({
    ...base,
    kind: input.kind as MetricKind,
    unit: input.unit as MetricUnit,
    value: input.value,
  });
}

export function normalizeAnalyticsEvent(
  inputValue: unknown,
  clock?: () => Date,
): AnalyticsEvent {
  return deepFreeze(normalizeBase(inputValue, BASE_EVENT_FIELDS, clock));
}

export function createObservabilityFactory(
  dependencies: ObservabilityDependencies,
) {
  const input = requirePlainObject(dependencies);
  if (
    typeof input.clock !== 'function' ||
    typeof input.correlationIdGenerator !== 'function'
  ) {
    return invalidEvent();
  }
  const clock = input.clock as () => Date;
  const correlationIdGenerator = input.correlationIdGenerator as () => string;
  return deepFreeze({
    correlation: (acceptedId?: unknown) =>
      createCorrelationContext(acceptedId, correlationIdGenerator),
    log: (input: StructuredLogEventInput) =>
      normalizeStructuredLogEvent(input, clock),
    metric: (input: MetricMeasurementInput) =>
      normalizeMetricMeasurement(input, clock),
    analytics: (input: EventInput) => normalizeAnalyticsEvent(input, clock),
  });
}
