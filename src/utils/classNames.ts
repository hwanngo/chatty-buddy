/** Join truthy class names into a single string (ported from react-boilerplate). */
export function classNames(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(' ');
}
