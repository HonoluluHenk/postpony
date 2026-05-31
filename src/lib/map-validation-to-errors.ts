import type { BaseIssue, BaseSchema, SafeParseResult } from 'valibot';

export function mapValidationToErrors(
  result: SafeParseResult<BaseSchema<unknown, unknown, BaseIssue<unknown>>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!result.issues) {
    return errors;
  }
  for (const issue of result.issues) {
    const key = issue.path?.[0]?.key;
    if (typeof key === 'string') {
      errors[key] = issue.message;
    }
  }
  return errors;
}
