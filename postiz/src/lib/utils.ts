export const makeId = (length = 10) => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
};

export const stripHtml = (html: string) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h2)>\s*<(p|div|h2)[^>]*>/gi, '\n')
    .replace(/<\/li>\s*<li[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

export const textToHtml = (text: string) =>
  text
    .split('\n')
    .map((line) => `<p>${line || ''}</p>`)
    .join('');

const avatarColors = [
  ['#612BD3', '#8C66FF'],
  ['#D82D7E', '#FC69FF'],
  ['#1D9BF0', '#6CC6FF'],
  ['#32D583', '#85F0B8'],
  ['#FFAC30', '#FFD08A'],
  ['#F97066', '#FFB1AA'],
  ['#4F46E5', '#8B90FF'],
  ['#0EA5E9', '#7DD3FC'],
];

// A deterministic gradient avatar with initials, so the demo works offline
export const avatar = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const [a, b] = avatarColors[Math.abs(hash) % avatarColors.length];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="32" font-weight="700" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// A colorful placeholder image for seeded media
export const placeholderImage = (label: string, hueSeed: number) => {
  const h1 = (hueSeed * 47) % 360;
  const h2 = (h1 + 60) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1},80%,55%)"/><stop offset="1" stop-color="hsl(${h2},80%,35%)"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="640" cy="140" r="90" fill="rgba(255,255,255,0.18)"/><circle cx="160" cy="480" r="140" fill="rgba(255,255,255,0.12)"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="56" font-weight="700" fill="#fff">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const isUSCitizen = () => {
  if (typeof navigator === 'undefined') return true;
  const lang = navigator.language || 'en-US';
  return lang === 'en-US';
};

export const timer = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
