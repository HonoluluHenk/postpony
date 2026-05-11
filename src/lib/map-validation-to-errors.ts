import type { ObjectSchema, SafeParseResult } from 'valibot';

export function mapValidationToErrors(result: SafeParseResult<ObjectSchema<any, undefined>>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!result.issues) {
    return errors;
  }
  for (const issue of result.issues) {
    if (issue.path && issue.path[0] && typeof issue.path[0].key === 'string') {
      const fieldName = issue.path[0].key;
      errors[fieldName] = issue.message;
    }
  }
  return errors;
}
