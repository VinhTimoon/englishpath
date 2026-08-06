export type PracticeQuestion = Readonly<{
  id: string;
  prompt: string;
  options: readonly Readonly<{ id: string; label: string }>[];
  correctOption: string;
  explanation: string;
  source: string;
  license: 'CC0-1.0';
  reviewStatus: 'REVIEWED';
  publishStatus: 'PUBLISHED';
  reviewedAt: string;
  publishedAt: string;
}>;

const REVIEWED_AT = '2026-08-06T00:00:00.000Z';

const provenance = (item: number) => ({
  source: `EnglishPath original quiz fixture ${String(item).padStart(3, '0')}`,
  license: 'CC0-1.0' as const,
  reviewStatus: 'REVIEWED' as const,
  publishStatus: 'PUBLISHED' as const,
  reviewedAt: REVIEWED_AT,
  publishedAt: REVIEWED_AT,
});

export const PRACTICE_QUESTIONS: readonly PracticeQuestion[] = [
  {
    id: 'p1',
    prompt: 'Choose the meaning of “agenda”.',
    options: [
      { id: 'a', label: 'chương trình họp' },
      { id: 'b', label: 'người tham dự' },
      { id: 'c', label: 'thời hạn' },
    ],
    correctOption: 'a',
    explanation: 'Agenda là danh sách nội dung cần thảo luận trong cuộc họp.',
    ...provenance(1),
  },
  {
    id: 'p2',
    prompt: 'She ___ English every day.',
    options: [
      { id: 'a', label: 'study' },
      { id: 'b', label: 'studies' },
      { id: 'c', label: 'studying' },
    ],
    correctOption: 'b',
    explanation: 'Chủ ngữ số ít ở hiện tại đơn dùng “studies”.',
    ...provenance(2),
  },
  {
    id: 'p3',
    prompt: '“Please arrive by 9 AM.” What should you do?',
    options: [
      { id: 'a', label: 'Arrive after lunch' },
      { id: 'b', label: 'Cancel the meeting' },
      { id: 'c', label: 'Be there no later than 9' },
    ],
    correctOption: 'c',
    explanation: '“By 9 AM” nghĩa là không muộn hơn 9 giờ.',
    ...provenance(3),
  },
  {
    id: 'p4',
    prompt: 'Choose the natural collocation.',
    options: [
      { id: 'a', label: 'make a decision' },
      { id: 'b', label: 'do a decision' },
      { id: 'c', label: 'take a decisioning' },
    ],
    correctOption: 'a',
    explanation: '“Make a decision” là collocation thông dụng.',
    ...provenance(4),
  },
  {
    id: 'p5',
    prompt: 'Complete: “Could you ___ that again?”',
    options: [
      { id: 'a', label: 'saying' },
      { id: 'b', label: 'say' },
      { id: 'c', label: 'said' },
    ],
    correctOption: 'b',
    explanation: 'Sau “could you” dùng động từ nguyên mẫu.',
    ...provenance(5),
  },
];
