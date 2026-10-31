import { describe, expect, it } from 'vitest';
import {
  emptyCreateCityFormValues,
  isCreateCityValidationKey,
  parseCreateCityForm,
} from './create-city-form';

describe('create-city-form', () => {
  it('parses a valid city and lowercases the slug', () => {
    expect(
      parseCreateCityForm({
        nameHe: ' עיר דוגמה ',
        nameEn: ' Example City ',
        slug: 'Example-City',
      })
    ).toEqual({
      success: true,
      data: {
        nameHe: 'עיר דוגמה',
        nameEn: 'Example City',
        slug: 'example-city',
      },
    });
  });

  it('requires names and a URL-safe slug', () => {
    expect(parseCreateCityForm(emptyCreateCityFormValues())).toEqual({
      success: false,
      errors: {
        nameHe: 'required',
        nameEn: 'required',
        slug: 'required',
      },
    });
    expect(
      parseCreateCityForm({
        nameHe: 'חולון',
        nameEn: 'Holon',
        slug: 'Holon City',
      })
    ).toEqual({
      success: false,
      errors: {
        slug: 'invalid_slug',
      },
    });
  });

  it('recognizes create-city validation keys', () => {
    expect(isCreateCityValidationKey('required')).toBe(true);
    expect(isCreateCityValidationKey('invalid_slug')).toBe(true);
    expect(isCreateCityValidationKey('invalid_time')).toBe(false);
  });
});
