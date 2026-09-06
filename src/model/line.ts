/* One line at a time. The parser classifies every line of a list with these
 * two functions and nothing else, so the whole grammar of "what is a bullet"
 * lives here. No lookbehind anywhere: the iOS regex floor is a hard rule. */

export interface BulletLine {
  /* Literal leading whitespace of the line. */
  indent: string;
  /* The marker: `-`, `*`, `+`, or a number followed by `.` or `)`. */
  bullet: string;
  /* Whitespace between the marker and what follows; empty only when the
     line ends right after the marker. */
  bulletGap: string;
  /* A task box such as `[ ]` or `[x]`, or null. Any single character
     counts, the way Obsidian reads task states. */
  checkbox: string | null;
  /* Whitespace after the box; empty when the line ends there. */
  checkboxGap: string;
  /* Everything after the prefix, verbatim. */
  content: string;
}

export type LineKind = 'bullet' | 'blank' | 'indented' | 'other';

const BULLET_RE = /^([ \t]*)([-*+]|\d+[.)])([ \t]+|$)(.*)$/;
const CHECKBOX_RE = /^(\[[^\]]\])([ \t]+|$)(.*)$/;
const BLANK_RE = /^[ \t]*$/;
const INDENTED_RE = /^[ \t]/;
const ORDERED_RE = /^(\d+)([.)])$/;

export function parseBulletLine(text: string): BulletLine | null {
  const m = BULLET_RE.exec(text);
  if (!m) return null;
  const indent = m[1] ?? '';
  const bullet = m[2] ?? '';
  const bulletGap = m[3] ?? '';
  const rest = m[4] ?? '';
  /* A box needs whitespace after the marker; `-[x]` is not a task. */
  const c = bulletGap.length > 0 ? CHECKBOX_RE.exec(rest) : null;
  if (c) {
    return { indent, bullet, bulletGap, checkbox: c[1] ?? null, checkboxGap: c[2] ?? '', content: c[3] ?? '' };
  }
  return { indent, bullet, bulletGap, checkbox: null, checkboxGap: '', content: rest };
}

export function lineKind(text: string): LineKind {
  if (BLANK_RE.test(text)) return 'blank';
  if (parseBulletLine(text)) return 'bullet';
  if (INDENTED_RE.test(text)) return 'indented';
  return 'other';
}

export function leadingWhitespace(text: string): string {
  const m = /^[ \t]*/.exec(text);
  return m ? m[0] : '';
}

/* `3.` gives { number: 3, close: '.' }; `-` gives null. */
export function orderedBullet(bullet: string): { number: number; close: string } | null {
  const m = ORDERED_RE.exec(bullet);
  if (!m) return null;
  return { number: Number(m[1]), close: m[2] ?? '.' };
}

/* Is the indentation of these strings one family? Mixed means a tab and a
 * space in one indent, or tabs in one line and spaces in another. A list
 * that fails this is left alone: no operation guesses at indentation. */
export function isMixedIndentation(indents: readonly string[]): boolean {
  let sawTab = false;
  let sawSpace = false;
  for (const s of indents) {
    const tab = s.includes('\t');
    const space = s.includes(' ');
    if (tab && space) return true;
    sawTab = sawTab || tab;
    sawSpace = sawSpace || space;
  }
  return sawTab && sawSpace;
}
