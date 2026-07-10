import type { BaseIssue, BaseSchema, SafeParseResult } from 'valibot';

export interface MappedErrors {
  fields: Record<string, string>;
  global?: string;
}

export function mapValidationToErrors(
  result: SafeParseResult<BaseSchema<unknown, unknown, BaseIssue<unknown>>>,
): MappedErrors {
  const fields: Record<string, string> = {};
  let global: string | undefined;

  if (!result.issues) {
    return {fields};
  }

  for (const issue of result.issues) {
    const key = issue.path?.[0]?.key;
    if (typeof key === 'string') {
      fields[key] = issue.message;
    } else {
      global = issue.message;
    }
  }

  return {fields, global};
}
