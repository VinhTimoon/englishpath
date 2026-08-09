import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { isEligibleLearnerLibraryVersion } from '../access/library-access-policy';
import {
  LIBRARY_CATALOGUE_PORT,
  type LibraryCataloguePort,
  type LibraryCatalogueRecord,
} from './library-catalogue.port';
import {
  CONTROLLED_MEDIA_PORT,
  LIBRARY_STORAGE_STATES,
  type ControlledMediaPort,
  type ControlledMediaResult,
} from './library-content.ports';
import type { LibraryCatalogueQueryDto } from './library-catalogue.dto';

const ALLOWED = new Set([
  'page',
  'size',
  'search',
  'level',
  'topic',
  'contentType',
]);
function safeProjection(r: LibraryCatalogueRecord) {
  return {
    itemId: r.version.contentId,
    versionId: r.version.versionId,
    title: r.title,
    summary: r.summary,
    taxonomy: {
      level: r.version.taxonomy.level,
      topic: r.version.taxonomy.topic,
      ...(r.version.taxonomy.subtopic
        ? { subtopic: r.version.taxonomy.subtopic }
        : {}),
      relatedSkills: [...r.version.taxonomy.relatedSkills],
    },
    contentType: r.contentType,
    durationMinutes: r.durationMinutes,
    level: r.level ?? r.version.taxonomy.level,
    availability: 'available' as const,
  };
}

@Injectable()
export class LibraryCatalogueService {
  constructor(
    @Inject(LIBRARY_CATALOGUE_PORT) private readonly port: LibraryCataloguePort,
    @Inject(CONTROLLED_MEDIA_PORT)
    private readonly media: ControlledMediaPort = {
      resolve: () => Promise.resolve({ state: 'PENDING' as const }),
    },
  ) {}

  async getItem(versionId: string) {
    if (!versionId.trim()) throw new BadRequestException('Invalid version ID');
    let record: LibraryCatalogueRecord | undefined;
    try {
      record = (await this.port.load()).find(
        (candidate) =>
          candidate.version.versionId === versionId &&
          isEligibleLearnerLibraryVersion(candidate.version),
      );
    } catch {
      throw new ServiceUnavailableException('Library catalogue unavailable');
    }
    if (!record) throw new NotFoundException('Library item not found');
    const segments = (record.transcript ?? [])
      .map((segment, index) => ({ ...segment, index }))
      .sort(
        (a, b) =>
          a.startSeconds - b.startSeconds ||
          (a.order ?? a.index) - (b.order ?? b.index) ||
          a.index - b.index,
      );
    if (
      segments.length > 500 ||
      segments.some(
        (s) =>
          !Number.isFinite(s.startSeconds) ||
          !Number.isFinite(s.endSeconds) ||
          s.startSeconds < 0 ||
          s.endSeconds < s.startSeconds ||
          typeof s.text !== 'string' ||
          !s.text.trim() ||
          s.text.length > 2000,
      )
    )
      throw new BadRequestException('Invalid transcript');
    const durationSeconds =
      record.durationSeconds ??
      (record.durationMinutes === undefined
        ? undefined
        : record.durationMinutes * 60);
    if (
      durationSeconds !== undefined &&
      (!Number.isFinite(durationSeconds) ||
        durationSeconds < 0 ||
        durationSeconds > 86_400)
    ) {
      throw new BadRequestException('Invalid media duration');
    }
    if (
      durationSeconds !== undefined &&
      segments.some((segment) => segment.endSeconds > durationSeconds)
    ) {
      throw new BadRequestException('Transcript exceeds media duration');
    }
    let mediaState: ControlledMediaResult['state'] = 'PENDING';
    if (record.storage) {
      try {
        const resolved = await this.media.resolve(record.storage);
        mediaState = LIBRARY_STORAGE_STATES.includes(resolved.state)
          ? resolved.state
          : 'QUARANTINED';
      } catch {
        mediaState = 'PENDING';
      }
    }
    return {
      itemId: record.version.contentId,
      versionId: record.version.versionId,
      title: record.title,
      summary: record.summary,
      taxonomy: {
        level: record.version.taxonomy.level,
        topic: record.version.taxonomy.topic,
        ...(record.version.taxonomy.subtopic
          ? { subtopic: record.version.taxonomy.subtopic }
          : {}),
        relatedSkills: [...record.version.taxonomy.relatedSkills],
      },
      durationSeconds,
      transcript: segments.map(({ startSeconds, endSeconds, text }) => ({
        startSeconds,
        endSeconds,
        text,
      })),
      media: { state: mediaState },
    };
  }

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
      records = (await this.port.load()).filter((record) =>
        isEligibleLearnerLibraryVersion(record.version),
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
    for (const [key, value, values] of [
      ['level', query.level, facets.levels],
      ['topic', query.topic, facets.topics],
      ['contentType', query.contentType, facets.contentTypes],
    ] as const) {
      if (value && !values.includes(value)) {
        throw new BadRequestException(`Unsupported catalogue ${key} filter`);
      }
    }
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
      items: filtered.slice((page - 1) * size, page * size).map(safeProjection),
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
