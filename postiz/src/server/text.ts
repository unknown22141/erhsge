const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const blocks = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|div|h1|h2|h3|li)>/gi, '\n');

const trim = (s: string) => s.replace(/\n{3,}/g, '\n\n').trim();

// Plain text, for Bluesky and Mastodon
export const toPlainText = (html: string) => trim(decode(blocks(html).replace(/<[^>]+>/g, '')));

// Markdown, for Discord
export const toMarkdown = (html: string) =>
  trim(
    decode(
      blocks(
        html
          .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**')
          .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*')
          .replace(/<u>([\s\S]*?)<\/u>/gi, '__$1__')
          .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
          .replace(/<h2[^>]*>/gi, '## ')
      ).replace(/<[^>]+>/g, '')
    )
  );

// The HTML subset Telegram accepts
export const toTelegramHtml = (html: string) => {
  const allowed = ['b', 'i', 'u', 's', 'a', 'code', 'pre', 'blockquote'];
  const out = blocks(html)
    .replace(/&nbsp;/g, ' ')
    .replace(/<(\/?)(strong|em|ins|h2)(\s[^>]*)?>/gi, (_, close, tag) => {
      const map: Record<string, string> = { strong: 'b', em: 'i', ins: 'u', h2: 'b' };
      return `<${close}${map[tag.toLowerCase()]}>`;
    })
    .replace(/<(\/?)([a-z0-9]+)([^>]*)>/gi, (match, close, tag, attrs) => {
      const name = tag.toLowerCase();
      if (!allowed.includes(name)) return '';
      if (name === 'a' && !close) {
        const href = /href="([^"]+)"/i.exec(attrs)?.[1];
        return href ? `<a href="${href}">` : '';
      }
      return `<${close}${name}>`;
    });
  return trim(out);
};
