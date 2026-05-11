import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { mapValidationToErrors } from './map-validation-to-errors';

describe('mapValidationToErrors', () => {
  describe('with a simple schema', () => {
    const simpleSchema = v.object({
      field1: v.pipe(v.string(), v.minLength(5, 'Field1 must be at least 5 characters long')),
      field2: v.pipe(v.number(), v.minValue(10, 'Field2 must be at least 10')),
    });


    it('should map validation errors for a schema with expected issues', () => {
      const result = v.safeParse(simpleSchema, {
        field1: 'abc', // Too short
        field2: 5, // Below min value
      });

      const errors = mapValidationToErrors(result);

      expect(errors)
        .toEqual({
          field1: 'Field1 must be at least 5 characters long',
          field2: 'Field2 must be at least 10',
        });
    });

    it('should return an empty object if there are no validation issues', () => {
      const result = v.safeParse(simpleSchema, {
        field1: 'validString',
        field2: 15,
      });

      const errors = mapValidationToErrors(result);

      expect(errors)
        .toEqual({});
    });

    it('should ignore invalid issue structures in the validation result', () => {
      const result = {
        success: false,
        // Issues list contains invalid entries to simulate potential inconsistencies
        issues: [
          {path: null, message: 'Invalid issue object'},
          {path: [], message: 'Another invalid issue'},
          {path: [{}], message: 'Missing key in path'},
        ],
      } as any; // Casting to SafeParseResult due to structured issues

      const errors = mapValidationToErrors(result);

      expect(errors)
        .toEqual({});
    });


    it('should handle undefined issues without throwing', () => {
      const result = {success: false, issues: undefined} as any;

      const errors = mapValidationToErrors(result);

      expect(errors)
        .toEqual({});
    });
  });

  describe('with a nested schema', () => {
    const nestedSchema = v.object({
      nested: v.object({
        subField: v.pipe(v.string(), v.minLength(3, 'SubField must be at least 3 characters long')),
      }),
    });

    it('should handle a schema with nested fields and map errors properly', () => {
      const result = v.safeParse(nestedSchema, {
        nested: {
          subField: 'ab', // Too short
        },
      });

      const errors = mapValidationToErrors(result);

      expect(errors)
        .toEqual({
          // FIXME: not yet sure if this is the correct behavior
          // might also be {nested: {subfield: 'the error message'}}
          nested: 'SubField must be at least 3 characters long', // Simpler paths only map top-level keys
        });
    });

  });
});
