/**
 * Type utility that makes all properties required but allows them to be undefined.
 * Converts optional properties (T?) to required properties that can be T | undefined.
 */
export type RemoveOptionality<T> = {
  [K in keyof Required<T>]: RemoveOptionalityValue<T[K]>
};

// takes care of number/string/...
type RemoveOptionalityValue<T> =
  T extends object
  ? RemoveOptionality<NonNullable<T>>
  : T;

/**
 * See {@link RemoveOptionality} but only for the top-level object.
 */
export type RemoveOptionalityFlat<T> = {
  [K in keyof Required<T>]: T[K]
};

/**
 * Function that enforcing explicitness of object properties by removing optionality.
 *
 * @param obj - The object to transform
 * @returns The same object with a type where all properties are required but can be undefined
 */
export function ensureProps<T>(
  obj: RemoveOptionality<T>,
): RemoveOptionality<T> {
  return obj;
}


/**
 * See [@link ensureProps] but only for the top-level object.
 * */
export function ensurePropsFlat<T>(
  obj: RemoveOptionalityFlat<T>,
): RemoveOptionalityFlat<T> {
  return obj;
}
