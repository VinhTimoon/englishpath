import { Injectable } from '@nestjs/common';
import { LibraryCatalogueService } from './library-catalogue.service';
import type { LibraryLinkKind } from './library-links.dto';

const LINK_ORDER: readonly LibraryLinkKind[] = [
  'roadmap',
  'vocabulary',
  'quiz',
];
const ROUTES: Readonly<Record<LibraryLinkKind, string>> = {
  roadmap: '/roadmap',
  vocabulary: '/vocabulary',
  quiz: '/daily-practice',
};
const LABELS: Readonly<Record<LibraryLinkKind, string>> = {
  roadmap: 'Xem lộ trình hôm nay',
  vocabulary: 'Khám phá từ vựng liên quan',
  quiz: 'Luyện tập bằng bài quiz',
};

@Injectable()
export class LibraryLinksService {
  constructor(private readonly catalogue: LibraryCatalogueService) {}

  async getLinks(versionId: string) {
    const item = await this.catalogue.getItem(versionId);
    const context = encodeURIComponent(versionId);
    const links = LINK_ORDER.map((kind) => ({
      kind,
      label: LABELS[kind],
      href: `${ROUTES[kind]}?returnVersionId=${context}`,
    }));

    return {
      status: links.length ? ('success' as const) : ('empty' as const),
      versionId: item.versionId,
      links,
    };
  }
}
