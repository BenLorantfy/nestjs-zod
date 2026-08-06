import { createZodDto, isZodDto, type ZodDto } from './index';
import * as z4 from 'zod/v4';
describe('main entrypoint exports', () => {
  it('re-exports isZodDto (regression test for #431)', () => {
    const UserSchema = z4.object({
      username: z4.string(),
    });

    class UserDto extends createZodDto(UserSchema) {}

    expect(isZodDto(UserDto)).toBe(true);
    expect(isZodDto({})).toBe(false);
  });

  it('re-exports the ZodDto type (regression test for #431)', () => {
    const UserSchema = z4.object({
      username: z4.string(),
    });

    class UserDto extends createZodDto(UserSchema) {}

    // If ZodDto were not exported from the main entrypoint, this would fail
    // to type-check.
    const dto: ZodDto<typeof UserSchema> = UserDto;

    expect(isZodDto(dto)).toBe(true);
  });
});
