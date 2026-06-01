import { describe, expectTypeOf, test } from 'vitest';
import { ensureProps, ensurePropsFlat } from './ensure';

describe('ensure', () => {

  describe('ensureProps', () => {
    test('enforces all nested properties to be present but allows undefined', () => {
      interface NestedWithOptionals {
        a?: string | undefined;
        b?: string;
        nested?: {
          c?: number;
          deepNested?: {
            e?: string;
            f: number | undefined;
          };
          d: boolean | undefined;
        };
        always: string;
      }

      const value = ensureProps<NestedWithOptionals>({
        a: undefined,
        b: undefined,
        nested: {
          c: undefined,
          deepNested: {
            e: undefined,
            f: undefined,
          },
          d: undefined,
        },
        always: 'test',
      });

      expectTypeOf(value)
        .toEqualTypeOf<{
          a: string | undefined;
          b: string | undefined;
          nested: {
            c: number | undefined;
            deepNested: {
              e: string | undefined;
              f: number | undefined;
            } | undefined;
            d: boolean | undefined;
          } | undefined;
          always: string;
        }>();
    });
  });

  describe('ensurePropsFlat', () => {
    test('enforces only top-level properties to be present but allows undefined', () => {
      interface FooWithNestedOptionals {
        a?: string | undefined;
        nested?: {
          b?: number;
          c: boolean | undefined;
        };
        always: string;
      }

      const value = ensurePropsFlat<FooWithNestedOptionals>({
        a: undefined,
        nested: {
          c: undefined,
        },
        always: 'test',
      });

      expectTypeOf(value)
        .toEqualTypeOf<{
          a: string | undefined;
          nested: {
            b?: number;
            c: boolean | undefined;
          } | undefined;
          always: string;
        }>();
    });
  });

});

