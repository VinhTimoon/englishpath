import {
  OBSERVABILITY_ERROR_CODES,
  ObservabilityError,
  type ObservabilityErrorCode,
} from './observability.error';
import {
  createCorrelationContext,
  createObservabilityFactory,
  normalizeAnalyticsEvent,
  normalizeMetricMeasurement,
  normalizeStructuredLogEvent,
  redactAndValidateAttributes,
} from './observability.models';

const timestamp = '2026-07-17T00:00:00.000Z';
const correlation = Object.freeze({ correlationId: 'corr-00000001' });

function expectObservabilityError(
  action: () => unknown,
  code: ObservabilityErrorCode,
) {
  try {
    action();
    fail('Expected observability operation to throw.');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ObservabilityError);
    expect(error).toMatchObject({ code });
  }
}

describe('observability models', () => {
  it('accepts or deterministically generates correlation context', () => {
    expect(
      createCorrelationContext('incoming-0001', () => 'unused-00001'),
    ).toEqual({
      correlationId: 'incoming-0001',
    });
    expect(createCorrelationContext(undefined, () => 'generated-0001')).toEqual(
      {
        correlationId: 'generated-0001',
      },
    );
  });

  it.each(['short-1', 'x'.repeat(129), 'invalid/correlation'])(
    'rejects malformed correlation IDs: %s',
    (correlationId) => {
      expectObservabilityError(
        () => createCorrelationContext(correlationId, () => 'unused-00001'),
        OBSERVABILITY_ERROR_CODES.INVALID_CORRELATION,
      );
    },
  );

  it('rejects malformed correlation IDs returned by the generator', () => {
    expectObservabilityError(
      () => createCorrelationContext(undefined, () => 'bad'),
      OBSERVABILITY_ERROR_CODES.INVALID_CORRELATION,
    );
  });

  it('propagates one correlation context and injected clock across event types', () => {
    const factory = createObservabilityFactory({
      clock: () => new Date(timestamp),
      correlationIdGenerator: () => correlation.correlationId,
    });
    const context = factory.correlation();
    const base = { name: 'learning.session', correlation: context };
    const log = factory.log({ ...base, severity: 'info' });
    const metric = factory.metric({
      ...base,
      name: 'api.latency',
      kind: 'histogram',
      unit: 'milliseconds',
      value: 42,
    });
    const analytics = factory.analytics({
      ...base,
      name: 'guest.signup_started',
    });

    for (const event of [log, metric, analytics]) {
      expect(event.correlation).toEqual(context);
      expect(event.timestamp).toBe(timestamp);
      expect(Object.isFrozen(event)).toBe(true);
      expect(Object.isFrozen(event.correlation)).toBe(true);
      expect(Object.isFrozen(event.attributes)).toBe(true);
    }
  });

  it('redacts sensitive keys before producing immutable attributes', () => {
    const attributes = redactAndValidateAttributes({
      routeTemplate: '/api/v1/health',
      success: true,
      Authorization_Header: 'Bearer private-token',
      user_email: 'private@example.com',
      correctAnswer: 'A',
      private_source_path: 'drive://secret',
      paymentPayload: 'private-payment',
      rawFreeText: 'private text',
      name: 'Private Name',
      userName: 'private-user',
      privateLocation: 'private-location',
      providerResponse: 'private-provider-response',
      learnerIdentity: 'private-identity',
      userId: 'person@example.com',
      apiKey: 'secret',
      harmlessLabel: 'another@example.com',
      requestValue: 'Bearer value-secret',
      contactValue: '+84 912 345 678',
      message: 'raw learner sentence',
      answer: 'private answer A',
      path: 'drive/private/folder',
      neutralLabel: 'arbitrary raw text',
    });

    expect(attributes).toEqual({
      routeTemplate: '/api/v1/health',
      success: true,
    });
    expect(JSON.stringify(attributes)).not.toContain('private');
    expect(Object.isFrozen(attributes)).toBe(true);
  });

  it.each([
    { attributes: { nested: { value: true } } },
    { attributes: null },
    { attributes: { list: ['value'] } },
    { attributes: { value: Number.NaN } },
    { attributes: { value: 'x'.repeat(257) } },
    { attributes: { ['x'.repeat(65)]: true } },
    {
      attributes: Object.fromEntries(
        Array.from({ length: 33 }, (_, index) => [`key${index}`, index]),
      ),
    },
  ])('rejects invalid bounded attributes: %p', ({ attributes }) => {
    expectObservabilityError(
      () => redactAndValidateAttributes(attributes),
      OBSERVABILITY_ERROR_CODES.INVALID_ATTRIBUTES,
    );
  });

  it.each([
    () => normalizeAnalyticsEvent(null),
    () => normalizeAnalyticsEvent([]),
    () => normalizeAnalyticsEvent(new Date()),
    () =>
      normalizeAnalyticsEvent({
        name: 'Bad Name',
        timestamp,
        correlation,
      }),
    () =>
      normalizeAnalyticsEvent({
        name: 'valid.name',
        timestamp: '2026-02-30T00:00:00.000Z',
        correlation,
      }),
    () =>
      normalizeAnalyticsEvent({
        name: 'valid.name',
        timestamp,
        correlation,
        unexpected: true,
      }),
    () =>
      normalizeStructuredLogEvent({
        name: 'log.event',
        timestamp,
        correlation,
        severity: 'notice',
      }),
    () =>
      normalizeMetricMeasurement({
        name: 'metric.event',
        timestamp,
        correlation,
        kind: 'timer',
        unit: 'milliseconds',
        value: 1,
      }),
    () =>
      normalizeMetricMeasurement({
        name: 'metric.event',
        timestamp,
        correlation,
        kind: 'gauge',
        unit: 'count',
        value: Number.POSITIVE_INFINITY,
      }),
  ])('returns stable typed failures for malformed runtime events', (action) => {
    expectObservabilityError(action, OBSERVABILITY_ERROR_CODES.INVALID_EVENT);
  });

  it('sanitizes generator, clock, correlation, and attribute failures', () => {
    const secret = 'Bearer do-not-leak';
    const actions = [
      () => createCorrelationContext(undefined, null as never),
      () =>
        createCorrelationContext(undefined, () => {
          throw new Error(secret);
        }),
      () =>
        normalizeAnalyticsEvent({ name: 'event.name', correlation }, () => {
          throw new Error(secret);
        }),
      () => redactAndValidateAttributes({ nested: { secret } }),
    ];

    for (const action of actions) {
      try {
        action();
        fail('Expected operation to throw.');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ObservabilityError);
        expect(String(error)).not.toContain(secret);
      }
    }
  });

  it('rejects throwing accessors without invoking or leaking them', () => {
    const secret = 'accessor-secret-must-not-leak';
    const getter = jest.fn(() => {
      throw new Error(secret);
    });
    const event = {
      name: 'event.name',
      timestamp,
      correlation,
    };
    Object.defineProperty(event, 'attributes', {
      enumerable: true,
      get: getter,
    });

    try {
      normalizeAnalyticsEvent(event);
      fail('Expected accessor input to fail.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ObservabilityError);
      expect(String(error)).not.toContain(secret);
      expect(getter).not.toHaveBeenCalled();
    }

    const attributes = {};
    Object.defineProperty(attributes, 'token', {
      enumerable: true,
      get: getter,
    });
    expectObservabilityError(
      () => redactAndValidateAttributes(attributes),
      OBSERVABILITY_ERROR_CODES.INVALID_ATTRIBUTES,
    );
    expect(getter).not.toHaveBeenCalled();
  });

  it('rejects mutation of normalized event graphs', () => {
    const event = normalizeStructuredLogEvent({
      name: 'api.request',
      timestamp,
      correlation,
      severity: 'info',
      attributes: { routeTemplate: '/health' },
    });

    expect(() => {
      (event as { name: string }).name = 'mutated';
    }).toThrow(TypeError);
    expect(() => {
      (event.attributes as Record<string, unknown>).routeTemplate = '/mutated';
    }).toThrow(TypeError);
  });
});
