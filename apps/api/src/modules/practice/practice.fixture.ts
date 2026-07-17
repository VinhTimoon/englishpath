export type PracticeQuestion = Readonly<{
  id: string;
  prompt: string;
  options: readonly Readonly<{ id: string; label: string }>[];
  correctOption: string;
  explanation: string;
}>;

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
  },
];
