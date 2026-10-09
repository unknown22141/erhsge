// Unicode styling used by Postiz for platforms without rich text
// (new-launch/bold.text.tsx and new-launch/u.text.tsx)

const lower = 'abcdefghijklmnopqrstuvwxyz';
const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const digits = '0123456789';

const boldMap: Record<string, string> = {};
[...lower].forEach((c, i) => (boldMap[c] = String.fromCodePoint(0x1d5ee + i)));
[...upper].forEach((c, i) => (boldMap[c] = String.fromCodePoint(0x1d5d4 + i)));
[...digits].forEach((c, i) => (boldMap[c] = String.fromCodePoint(0x1d7ec + i)));
const boldReverse = Object.fromEntries(Object.entries(boldMap).map(([k, v]) => [v, k]));

export const toggleBold = (text: string) => {
  const chars = [...text];
  const isBold = chars.some((c) => boldReverse[c]);
  return chars.map((c) => (isBold ? boldReverse[c] || c : boldMap[c] || c)).join('');
};

const UNDERLINE = '̲';
export const toggleUnderline = (text: string) => {
  if (text.includes(UNDERLINE)) {
    return text.split(UNDERLINE).join('');
  }
  return [...text].map((c) => (/\s/.test(c) ? c : c + UNDERLINE)).join('');
};
