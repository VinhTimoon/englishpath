import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ToeicPart } from '../../generated/prisma/enums';
import { ToeicQuestionQueryDto } from './dto/toeic-question-query.dto';

describe('ToeicQuestionQueryDto', () => {
  it('transforms bounded pagination and accepts closed filters', async () => {
    const dto = plainToInstance(ToeicQuestionQueryDto, {
      page: '2',
      size: '50',
      part: ToeicPart.PART_3,
      topic: 'workplace',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.size).toBe(50);
  });

  it('rejects invalid enum and pagination values', async () => {
    const dto = plainToInstance(ToeicQuestionQueryDto, {
      page: '0',
      size: '101',
      part: 'PART_9',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
