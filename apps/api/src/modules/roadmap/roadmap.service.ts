import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PRACTICE_REPOSITORY } from '../practice/practice.models';
import type { PracticeRepository } from '../practice/practice.ports';
import type { ApplicationPrincipal } from '../access';
import {
  ROADMAP_REPOSITORY,
  type RoadmapItemStatus,
  type RoadmapView,
} from './roadmap.models';
import type { RoadmapRepository } from './roadmap.ports';
import { buildRoadmap } from './roadmap.engine';
import { projectRoadmapFourSkills } from './four-skills.balance';
import { adaptRoadmap } from './adaptive-roadmap.policy';

@Injectable()
export class RoadmapService {
  constructor(
    @Inject(ROADMAP_REPOSITORY)
    private readonly repository: RoadmapRepository,
    @Inject(PRACTICE_REPOSITORY)
    private readonly practice: PracticeRepository,
  ) {}

  async generate(principal: ApplicationPrincipal) {
    const userId = principal.applicationUserId;
    const existing = await this.repository.findCurrent(userId);
    if (existing) return this.withToday(existing);
    const seed = await this.requireSeed(userId);
    return this.withToday(
      await this.repository.createVersion(
        userId,
        seed,
        buildRoadmap(seed),
        false,
      ),
    );
  }

  async current(principal: ApplicationPrincipal) {
    const roadmap = await this.repository.findCurrent(
      principal.applicationUserId,
    );
    return roadmap ? this.withToday(roadmap) : null;
  }

  async recalculate(principal: ApplicationPrincipal) {
    const userId = principal.applicationUserId;
    const current = await this.repository.findCurrent(userId);
    if (!current) throw new ConflictException('Generate a roadmap first.');
    const seed = await this.requireSeed(userId);
    const evidence = this.practice.roadmapAdaptiveEvidence
      ? await this.practice.roadmapAdaptiveEvidence(userId)
      : { policyVersion: 'adaptive-roadmap-v1' as const, domains: [] };
    const items = adaptRoadmap(current, evidence);
    const equivalent =
      current.items.length === items.length &&
      current.items.every((item, index) => {
        const next = items[index];
        return (
          next &&
          JSON.stringify({ ...item, id: undefined }) === JSON.stringify(next)
        );
      });
    if (equivalent) return this.withToday(current);
    return this.withToday(
      await this.repository.createVersion(userId, seed, items, true),
    );
  }

  async updateItem(
    principal: ApplicationPrincipal,
    itemId: string,
    status: RoadmapItemStatus,
  ) {
    const roadmap = await this.repository.updateItem(
      principal.applicationUserId,
      itemId,
      status,
    );
    if (!roadmap) throw new NotFoundException();
    return this.withToday(roadmap);
  }

  private async requireSeed(userId: string) {
    const seed = await this.repository.loadSeed(userId);
    if (!seed) {
      throw new ConflictException('Complete onboarding and placement first.');
    }
    return seed;
  }

  private withToday(roadmap: RoadmapView) {
    const elapsed = Math.floor(
      (Date.now() - roadmap.generatedAt.getTime()) / 86_400_000,
    );
    const todayNumber = Math.min(
      roadmap.durationDays,
      Math.max(1, elapsed + 1),
    );
    const todayItems = roadmap.items.filter(
      ({ dayNumber }) => dayNumber === todayNumber,
    );
    return {
      ...roadmap,
      fourSkills: projectRoadmapFourSkills(roadmap.items),
      todayNumber,
      todayItems,
      completedItems: roadmap.items.filter(
        ({ status }) => status === 'COMPLETED',
      ).length,
      totalItems: roadmap.items.length,
    };
  }
}
