import { NotFoundException } from '@nestjs/common';
import { LibraryLinksService } from './library-links.service';

describe('LibraryLinksService', () => {
  it('returns deterministic allow-listed links with bounded context', async () => {
    const catalogue = {
      getItem: jest.fn().mockResolvedValue({ versionId: 'version one' }),
    };
    const service = new LibraryLinksService(catalogue as never);

    const result = await service.getLinks('version one');
    expect(result.status).toBe('success');
    expect(result.versionId).toBe('version one');
    expect(result.links.map((link) => link.kind)).toEqual([
      'roadmap',
      'vocabulary',
      'quiz',
    ]);
    expect(result.links.map((link) => link.href)).toEqual([
      '/roadmap?returnVersionId=version%20one',
      '/vocabulary?returnVersionId=version%20one',
      '/daily-practice?returnVersionId=version%20one',
    ]);
    expect(JSON.stringify(result)).not.toContain('source');
  });

  it('delegates eligibility failures without fabricating links', async () => {
    const catalogue = {
      getItem: jest.fn().mockRejectedValue(new NotFoundException()),
    };
    const service = new LibraryLinksService(catalogue as never);

    await expect(service.getLinks('withdrawn')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
