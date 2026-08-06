import { TOEIC_ERROR_CODES } from './toeic-question.error';
import type {
  SafeToeicQuestion,
  ToeicQuestionRepository,
} from './toeic-question.models';
import { ToeicQuestionService } from './toeic-question.service';
import {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../generated/prisma/enums';

const safeQuestion: SafeToeicQuestion = {
  id: 'version-1',
  questionId: 'question-1',
  version: 1,
  part: ToeicPart.PART_1,
  questionType: ToeicQuestionType.PHOTO_DESCRIPTION,
  difficulty: ToeicDifficulty.ELEMENTARY,
  topic: 'office',
  stimulusGroup: null,
  prompt: 'A learner-safe prompt',
  options: [{ id: 'A', text: 'Option A' }],
  mediaReference: null,
  explanation: 'A learner-safe explanation',
};

describe('ToeicQuestionService', () => {
  it('returns a stable paginated projection without governance fields', async () => {
    const list = jest
      .fn()
      .mockResolvedValue({ items: [safeQuestion], totalItems: 1 });
    const repository: jest.Mocked<ToeicQuestionRepository> = {
      list,
      find: jest.fn(),
    };
    const service = new ToeicQuestionService(repository);

    const result = await service.list({ page: 2, size: 1 });

    expect(result.page).toEqual({
      number: 2,
      size: 1,
      totalItems: 1,
      totalPages: 1,
    });
    expect(JSON.stringify(result)).not.toContain('correctAnswer');
    expect(JSON.stringify(result)).not.toContain('rightsOwner');
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, size: 1, skip: 1, take: 1 }),
    );
  });

  it('maps missing questions to a sanitized not-found error', async () => {
    const repository: jest.Mocked<ToeicQuestionRepository> = {
      list: jest.fn(),
      find: jest.fn().mockResolvedValue(null),
    };
    const service = new ToeicQuestionService(repository);

    await expect(service.get('missing')).rejects.toMatchObject({
      code: TOEIC_ERROR_CODES.NOT_FOUND,
    });
  });

  it('maps repository failures to a sanitized internal error', async () => {
    const repository: jest.Mocked<ToeicQuestionRepository> = {
      list: jest.fn().mockRejectedValue(new Error('private database detail')),
      find: jest.fn(),
    };
    const service = new ToeicQuestionService(repository);

    await expect(service.list({ page: 1, size: 20 })).rejects.toMatchObject({
      code: TOEIC_ERROR_CODES.REPOSITORY_FAILURE,
    });
    await expect(service.list({ page: 1, size: 20 })).rejects.not.toThrow(
      'private database detail',
    );
  });
});
