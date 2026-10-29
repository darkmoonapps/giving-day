import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RespondToDistributionDayDto } from './respond-to-distribution-day.dto';

async function validateRespondDto(
  payload: Record<string, unknown>
): Promise<{ dto: RespondToDistributionDayDto; errorCount: number }> {
  const dto = plainToInstance(RespondToDistributionDayDto, payload);
  const errors = await validate(dto);
  return { dto, errorCount: errors.length };
}

describe('RespondToDistributionDayDto', () => {
  it('accepts a confirm payload without a reason', async () => {
    const { errorCount } = await validateRespondDto({ status: 'confirmed' });

    expect(errorCount).toBe(0);
  });

  it('accepts a decline payload with a trimmed reason', async () => {
    const { dto, errorCount } = await validateRespondDto({
      status: 'declined',
      cancelReason: '  Family event in Holon  ',
    });

    expect(errorCount).toBe(0);
    expect(dto.cancelReason).toBe('Family event in Holon');
  });

  it('rejects a decline without a reason', async () => {
    const { errorCount } = await validateRespondDto({ status: 'declined' });

    expect(errorCount).toBeGreaterThan(0);
  });

  it('rejects a whitespace-only decline reason', async () => {
    const { dto, errorCount } = await validateRespondDto({
      status: 'declined',
      cancelReason: '   ',
    });

    expect(dto.cancelReason).toBe('');
    expect(errorCount).toBeGreaterThan(0);
  });
});
