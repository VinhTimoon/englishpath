import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { isEligibleLearnerLibraryVersion } from '../access/library-access-policy';
import {
  LIBRARY_CATALOGUE_PORT,
  type LibraryCataloguePort,
  type LibraryCatalogueRecord,
} from './library-catalogue.port';
import type { LibraryCatalogueQueryDto } from './library-catalogue.dto';

const ALLOWED = new Set([
  'page',
  'size',
  'search',
  'level',
  'topic',
  'contentType',
]);
const safe = (r: LibraryCatalogueRecord) => ({
  itemId: r.version.contentId,
  versionId: r.version.versionId,
  title: r.title,
  summary: r.summary,
  taxonomy: r.version.taxonomy,
  contentType: r.contentType,
  durationMinutes: r.durationMinutes,
  level: r.level ?? r.version.taxonomy.level,
  availability: 'available' as const,
});

@Injectable()
export class LibraryCatalogueService {
  constructor(
    @Inject(LIBRARY_CATALOGUE_PORT) private readonly port: LibraryCataloguePort,
  ) {}

  async query(query: LibraryCatalogueQueryDto) {
    const pageValue = query.page === undefined ? 1 : Number(query.page);
    const sizeValue = query.size === undefined ? 12 : Number(query.size);
    if (
      !Number.isInteger(pageValue) ||
      pageValue < 1 ||
      !Number.isInteger(sizeValue) ||
      sizeValue < 1 ||
      sizeValue > 50
    )
      throw new BadRequestException('Invalid pagination');
    const unknown = Object.keys(query).filter((key) => !ALLOWED.has(key));
    if (unknown.length)
      throw new BadRequestException('Unsupported catalogue query field');
    let records: readonly LibraryCatalogueRecord[];
    try {
      records = (await this.port.load()).filter((r) =>
        isEligibleLearnerLibraryVersion(r.version),
      );
    } catch {
      throw new ServiceUnavailableException('Library catalogue unavailable');
    }
    const facets = {
      levels: [
        ...new Set(records.map((r) => r.level ?? r.version.taxonomy.level)),
      ].sort(),
      topics: [...new Set(records.map((r) => r.version.taxonomy.topic))].sort(),
      contentTypes: [...new Set(records.map((r) => r.contentType))].sort(),
    };
    const search = query.search?.trim().toLocaleLowerCase('en-US');
    const filtered = records
      .filter(
        (r) =>
          (!search ||
            `${r.title} ${r.summary}`
              .toLocaleLowerCase('en-US')
              .includes(search)) &&
          (!query.level ||
            (r.level ?? r.version.taxonomy.level) === query.level) &&
          (!query.topic || r.version.taxonomy.topic === query.topic) &&
          (!query.contentType || r.contentType === query.contentType),
      )
      .sort((a, b) =>
        `${a.title}\0${a.version.versionId}`.localeCompare(
          `${b.title}\0${b.version.versionId}`,
        ),
      );
    const page = pageValue;
    const size = sizeValue;
    return {
      status: filtered.length
        ? 'success'
        : records.length
          ? 'filtered-empty'
          : 'empty',
      items: filtered.slice((page - 1) * size, page * size).map(safe),
      facets,
      pagination: {
        page,
        size,
        total: filtered.length,
        pages: Math.ceil(filtered.length / size),
      },
    };
  }
}
