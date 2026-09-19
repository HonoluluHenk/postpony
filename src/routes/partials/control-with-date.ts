import type { TranslateFn, TranslationKeys } from '../../locales';

/**
 * Composes a per-row control's accessible name from its translated control
 * label and the row's own display string, via the shared "control · date"
 * locale template. Reused by the edit rail's per-row Delete / Votable / Confirm
 * Date controls and later by the vote page's row controls, so a screenreader
 * never hears the same bare control name twice on different dates.
 */
export function controlNameWithDate(t: TranslateFn, controlKey: TranslationKeys, date: string): string {
  return t('control_with_date', {control: t(controlKey), date});
}