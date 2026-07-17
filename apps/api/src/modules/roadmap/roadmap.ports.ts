import type {
  RoadmapItemDraft,
  RoadmapItemStatus,
  RoadmapSeed,
  RoadmapView,
} from './roadmap.models';

export interface RoadmapRepository {
  loadSeed(userId: string): Promise<RoadmapSeed | null>;
  findCurrent(userId: string): Promise<RoadmapView | null>;
  createVersion(
    userId: string,
    seed: RoadmapSeed,
    items: readonly RoadmapItemDraft[],
    replaceCurrent: boolean,
  ): Promise<RoadmapView>;
  updateItem(
    userId: string,
    itemId: string,
    status: RoadmapItemStatus,
  ): Promise<RoadmapView | null>;
}
