import { expect, test } from "@playwright/test";

const apiOrigin = "http://localhost:3005/api/v1";
const recordingId = "speaking-recording-browser";
const capability = "browser-capability-token";

test("controlled playback keeps the capability boundary in the browser", async ({
  page,
}) => {
  await page.route(
    `${apiOrigin}/toeic/speaking/recordings/${recordingId}/playback-capability`,
    async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          data: {
            playback: {
              recordingId,
              capability,
              expiresAt: "2026-08-11T08:00:00.000Z",
            },
          },
          meta: {
            correlationId: "browser-recording",
            idempotencyStatus: "not_applicable",
          },
        }),
      }),
  );
  await page.route(
    `${apiOrigin}/toeic/speaking/recordings/${recordingId}/playback`,
    async (route) => {
      const supplied = route.request().headers()["x-playback-capability"];
      const valid = supplied === capability;
      await route.fulfill({
        status: valid ? 200 : 403,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(
          valid
            ? {
                data: {
                  recording: {
                    recordingId,
                    state: "AVAILABLE",
                    contentType: "audio/webm",
                    durationSeconds: 20,
                    sizeBytes: 2048,
                    expiresAt: "2026-09-09T00:00:00.000Z",
                  },
                  playback: {
                    authorized: true,
                    expiresAt: "2026-08-11T08:00:00.000Z",
                  },
                },
              }
            : { error: { code: "PLAYBACK_FORBIDDEN" } },
        ),
      });
    },
  );

  await page.goto("/");
  const result = await page.evaluate(
    async ({ apiOrigin: origin, id }) => {
      const capabilityResponse = await fetch(
        `${origin}/toeic/speaking/recordings/${id}/playback-capability`,
        { headers: { Authorization: "Bearer browser-token" }, method: "POST" },
      );
      const issued = (await capabilityResponse.json()) as {
        data: { playback: { capability: string } };
      };
      const wrongResponse = await fetch(
        `${origin}/toeic/speaking/recordings/${id}/playback`,
        {
          headers: {
            Authorization: "Bearer browser-token",
            "X-Playback-Capability": "wrong-capability",
          },
        },
      );
      const validResponse = await fetch(
        `${origin}/toeic/speaking/recordings/${id}/playback`,
        {
          headers: {
            Authorization: "Bearer browser-token",
            "X-Playback-Capability": issued.data.playback.capability,
          },
        },
      );
      return {
        issued: issued.data.playback,
        wrongStatus: wrongResponse.status,
        validStatus: validResponse.status,
        validBody: await validResponse.json(),
      };
    },
    { apiOrigin, id: recordingId },
  );

  expect(result.issued.capability).toBe(capability);
  expect(result.wrongStatus).toBe(403);
  expect(result.validStatus).toBe(200);
  expect(JSON.stringify(result.validBody)).not.toMatch(
    /provider|objectKey|tokenHash|credential/i,
  );
});
