/**
 * Fenced blocks and inline code spans. Split on this and the captured code
 * lands at odd indices, so the transforms below can skip it — escaping a `$`
 * inside `` `$5` `` would put a literal backslash into the user's code.
 */
const CODE_SEGMENT = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;

/**
 * `$` is both a math delimiter and a currency symbol, and with single-dollar
 * math enabled the parser can't tell them apart: "costs $5 and shipping is
 * $10" parses `5 and shipping is ` as an equation and renders it as mangled
 * italics.
 *
 * The discriminator is whitespace against the delimiter. Real inline math is
 * tight — `$O(1)$`, `$2^n$` — whereas a currency pair only closes because
 * another price happened to follow, leaving a space against one end. So a
 * `$…$` pair whose contents begin or end with whitespace (or is empty) is
 * treated as currency and both delimiters are escaped.
 *
 * `$$…$$` blocks are matched first and passed through untouched.
 */
const escapeCurrencyDollars = (text: string): string =>
  text.replace(/\$\$[\s\S]*?\$\$|\$([^\n$]*)\$/g, (match, inline?: string) => {
    if (inline === undefined) return match; // $$…$$ block math
    if (inline.trim() === '' || /^\s|\s$/.test(inline)) {
      return `\\$${inline}\\$`;
    }
    return match;
  });

/**
 * Normalises LaTeX delimiters to the `$`/`$$` forms remark-math understands,
 * then neutralises dollar signs that are plainly currency.
 */
export const preprocessLaTeX = (content: string) =>
  content
    .split(CODE_SEGMENT)
    .map((segment, i) => {
      // Odd indices are the captured code segments — leave them verbatim.
      if (i % 2 === 1) return segment;

      // \[ … \] -> $$ … $$ and \( … \) -> $ … $. The contents are trimmed so
      // an author's spacing (`\( x \)`) doesn't later read as currency.
      const withBlockMath = segment.replace(
        /\\\[([\s\S]*?)\\\]/g,
        (_, equation: string) => `$$${equation.trim()}$$`
      );
      const withInlineMath = withBlockMath.replace(
        /\\\(([\s\S]*?)\\\)/g,
        (_, equation: string) => `$${equation.trim()}$`
      );

      return escapeCurrencyDollars(withInlineMath);
    })
    .join('');
