import {
  ROADMAP_ADAPTIVE_POLICY,
  type RoadmapItemDraft,
  type RoadmapView,
} from './roadmap.models';
import type {
  ErrorNotebookDomain,
  RoadmapAdaptiveEvidence,
} from '../practice/practice.models';

const domains: readonly ErrorNotebookDomain[] = [
  'GENERAL',
  'LISTENING',
  'READING',
  'SPEAKING',
  'WRITING',
];
const skillForDomain: Partial<
  Record<ErrorNotebookDomain, 'LISTENING' | 'READING'>
> = {
  LISTENING: 'LISTENING',
  READING: 'READING',
};

function validEvidence(
  evidence: RoadmapAdaptiveEvidence | null | undefined,
): evidence is RoadmapAdaptiveEvidence {
  if (
    !evidence ||
    typeof evidence !== 'object' ||
    evidence.policyVersion !== ROADMAP_ADAPTIVE_POLICY ||
    !Array.isArray(evidence.domains)
  )
    return false;
  const seen = new Set<string>();
  const valid = evidence.domains.every((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return false;
    const candidate = entry as {
      domain?: unknown;
      state?: unknown;
      entryCount?: unknown;
    };
    if (
      typeof candidate.domain !== 'string' ||
      typeof candidate.state !== 'string' ||
      typeof candidate.entryCount !== 'number'
    )
      return false;
    const domain = candidate.domain as ErrorNotebookDomain;
    if (
      !domains.includes(domain) ||
      seen.has(domain) ||
      !['available', 'empty', 'unavailable'].includes(candidate.state)
    )
      return false;
    seen.add(domain);
    if (
      (domain === 'SPEAKING' || domain === 'WRITING') &&
      (candidate.state !== 'unavailable' || candidate.entryCount !== 0)
    )
      return false;
    return (
      Number.isInteger(candidate.entryCount) &&
      candidate.entryCount >= 0 &&
      (candidate.state === 'available'
        ? candidate.entryCount > 0
        : candidate.entryCount === 0)
    );
  });
  return valid && seen.size === domains.length;
}

export function adaptRoadmap(
  current: RoadmapView,
  evidence: RoadmapAdaptiveEvidence | null | undefined,
): readonly RoadmapItemDraft[] {
  const source = current.items.map((value) => {
    const { id, ...item } = value;
    void id;
    return item;
  });
  if (!validEvidence(evidence)) return source;
  const stateRank = new Map<string, number>();
  const skillRank = new Map<string, number>([
    ['LISTENING', 0],
    ['READING', 1],
  ]);
  for (const domain of evidence.domains) {
    const skill = skillForDomain[domain.domain];
    if (skill && domain.state !== 'unavailable') {
      stateRank.set(skill, domain.state === 'available' ? 0 : 1);
    }
  }
  const byDay = new Map<number, typeof source>();
  for (const item of source)
    byDay.set(item.dayNumber, [...(byDay.get(item.dayNumber) ?? []), item]);
  return [...byDay.values()].flatMap((items) => {
    const pending = items
      .filter((item) => item.status === 'PENDING' && stateRank.has(item.skill))
      .sort(
        (a, b) =>
          stateRank.get(a.skill)! - stateRank.get(b.skill)! ||
          skillRank.get(a.skill)! - skillRank.get(b.skill)! ||
          a.sequence - b.sequence ||
          a.title.localeCompare(b.title),
      );
    let cursor = 0;
    return items.map((slot) => {
      const selected =
        slot.status === 'PENDING' && stateRank.has(slot.skill)
          ? pending[cursor++]
          : slot;
      return selected === slot
        ? slot
        : { ...selected, sequence: slot.sequence };
    });
  });
}
