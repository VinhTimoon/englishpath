export type RoadmapItem = {
  id: string;
  dayNumber: number;
  sequence: number;
  phase: string;
  skill: string;
  taskType: string;
  title: string;
  minutes: number;
  status: "PENDING" | "COMPLETED" | "SKIPPED";
};

export type Roadmap = {
  id: string;
  version: number;
  goal: string;
  level: string;
  durationDays: number;
  dailyMinutes: number;
  todayNumber: number;
  todayItems: RoadmapItem[];
  items: RoadmapItem[];
  completedItems: number;
  totalItems: number;
};

export type Envelope<T> = { data: T };
