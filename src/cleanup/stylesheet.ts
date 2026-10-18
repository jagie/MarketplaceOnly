import { GLOBAL_GUARDS, RULES, type CleanupRule } from './rules';

/** Attribute on <html> listing switched-off areas, e.g. "groups gaming". */
export const HIDE_ATTRIBUTE = 'data-marketplaceonly-hide';
/** Present on <html> when page-scope rules may run on this page. */
export const PAGE_ATTRIBUTE = 'data-marketplaceonly-page';

/**
 * The full selector for a rule, guards included. Used both to hide (in the
 * stylesheet) and to check status (querySelector), so what we report is
 * exactly what we hide.
 */
export function ruleSelector(rule: CleanupRule): string {
  const inside = [...GLOBAL_GUARDS.inside, ...(rule.neverMatchInside ?? [])];
  const guardInside = `:not(:is(${inside.join(', ')}) *)`;
  const guardContains = `:not(:has(${GLOBAL_GUARDS.contains.join(', ')}))`;
  return `:is(${rule.selectors.join(', ')})${guardInside}${guardContains}`;
}

/**
 * One static stylesheet for every rule. Switching an area on or off only
 * changes an attribute on <html>, so the change is instant, needs no
 * reload, and never removes anything from the page: it's purely visual.
 */
export function buildStylesheet(rules: readonly CleanupRule[] = RULES): string {
  return rules
    .map((rule) => {
      const gate = `html[${HIDE_ATTRIBUTE}~="${rule.area}"]${rule.scope === 'page' ? `[${PAGE_ATTRIBUTE}]` : ''}`;
      return `/* ${rule.id} */\n${gate} ${ruleSelector(rule)} { display: none !important; }`;
    })
    .join('\n');
}
