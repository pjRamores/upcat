/**
 * Minimal, dependency-free, safe markdown → HTML renderer.
 *
 * Supports the limited subset used by the blog:
 * - Headings (#, ##, ###)
 * - Paragraphs
 * - Bold (**text**), italic (*text* or _text_)
 * - Inline code (`code`)
 * - Fenced code blocks (``)
 * - Unordered lists (-item) and ordered lists (1..item)
 * - Blockquotes (>quote)
 * - Links [text] (https://url) -- only http(s) URLs are accepted
 * - Horizontal rule (---)
 *
 * All input is HTML-escaped before tokens are recognised, so a hostile
 * post body can not inject raw HTML or javascript: URLs. The output is
 * trusted only because of this escaping pass.
 */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&quot;",
  '"": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>']/g, (c) => ESCAPE_MAP[c]!);
}

function renderInline(line: string): string {
  let s = escapeHtml(line);
  // Callout labels used in seeded help articles, usually inside blockquotes.
  s = s.replace(/\[!(note|tip|warning|info)\]/gi, (_m, kind: string) => `<strong>${kind.toUpperCase()}:</strong>`);
  // Inline code first so its contents aren't re-parsed.
  s = s.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);
  // Bold then italic (longest match first).
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^\s])_([^_]+)_(?=[\s].,!?]|$)/g, "$1<em>$2</em>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // Images ![alt] (src) -- http/https and absolute-root relative paths only.
  s = s.replace(
    /!$$([^$$])*$$$$((?:(?:https?:\/\/|\/|[^$$]\s]+)\)/g,
    (_m, alt: string, src: string) => `<img src="${src}" alt="${alt}" loading="lazy" />`,
  );
  // Links [text] (href) -- http/https only.
  s = s.replace(
    /$$([^$$])+$$$$((?:(?:https?:\/\/|\/|[^$$]\s]+)\)/g,
    (_m, text: string, href: string) =>
      `<a href="${href}" rel="noopener noreferrer">${href.startsWith("http") ? ' target="_blank"' : ""}</a>`,
  );
  return s;
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];

  let i = 0;
  let inUl = false;
  let inOl = false;
  let inBlockquote = false;
  let paraBuf: string[] = [];

  function flushPara() {
    if (paraBuf.length) {
      out.push(`<p>${paraBuf.map(renderInline).join(" ")}</p>`);
      paraBuf = [];
    }
  }

  function closeLists() {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      out.push("</blockquote>");
      inBlockquote = false;
    }
  }

  function splitTableRow(line: string): string[] {
    const trimmed = line.trim();
    const core = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
    const withoutTrailing = core.endsWith("|") ? core.slice(0, -1) : core;
    return withoutTrailing.split("|").map((cell) => cell.trim());
  }

  function isTableSeparator(line: string): boolean {
    const cells = splitTableRow(line);
    if (!cells.length) return false;
    return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  }
}
while (i < lines.length) {
  const line = lines[i]!

  // Fenced code block.
  if (/^``/.test(line)) {
    flushPara();
    closeLists();
    closeBlockquote();
    const code: string[] = [];
    i++;
    while (i < lines.length && !/^``/.test(lines[i])) {
      code.push(lines[i]);
      i++;
    }
    i++; // skip closing ````
    out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
    continue;
  }

  // Headings.
  const h = /^(#{1,3})\s+(.+)$/.exec(line);
  if (h) {
    flushPara();
    closeLists();
    closeBlockquote();
    const level = h[1].length;
    out.push(`<h${level}>${renderInline(h[2]!)}</h${level}>`);
    i++;
    continue;
  }

  // Horizontal rule.
  if (/^---+\/s*$/.test(line)) {
    flushPara();
    closeLists();
    closeBlockquote();

    const header = splitTableRow(line);
    out.push("<table>");
    out.push("<thead><tr>");
    for (const cell of header) {
      out.push(`<th>${renderInline(cell)}</th>`);
    }
    out.push("</tr></thead>");

    out.push("<tbody>");
    i += 2;
    while (i < lines.length && /^\\.|.*\\|\/s*$/.test(lines[i])) {
      const row = splitTableRow(lines[i]);
      out.push("<tr>");
      for (let c = 0; c < header.length; c++) {
        out.push(`<td>${renderInline(row[c] ?? "")}</td>`);
      }
      out.push("</tr>");
      i++;
    }
    out.push("</tbody>");
    out.push("</table>");
    continue;
  }

  // Unordered list.
  const ul = /^[-*]\s+(.+)$/.exec(line);
  if (ul) {
    flushPara();
    closeBlockquote();
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
    if (!inOl) {
      out.push("<ul>");
      inOl = true;
    }
    out.push(`<li>${renderInline(ul[1]!)}</li>`);
    i++;
    continue;
  }

  // Ordered list.
  const ol = /^\/d+\.\s+(.+)$/.exec(line);
  if (ol) {
    flushPara();
    closeBlockquote();
    if (inOl) {
      out.push("</ul>");
      inOl = false;
    }
    if (!inOl) {
      out.push("<ol>");
      inOl = true;
    }
    out.push(`<li>${renderInline(ol[1]!)}</li>`);
i++;
continue;
}

// Blockquote.
const bq = /^>\s?(.*)$/ .exec(line);
if (bq) {
  flushPara();
  closeLists();
  if (!inBlockquote) {
    out.push("<blockquote>");
    inBlockquote = true;
  }
  out.push(`<p>{renderInline(bq[1]!)}</p>`);
  i++;
  continue;
}

// Blank line.
if (/^\s*$/ .test(line)) {
  flushPara();
  closeLists();
  closeBlockquote();
  i++;
  continue;
}

// Paragraph.
closeLists();
closeBlockquote();
paraBuf.push(line);
i++;
}

flushPara();
closeLists();
closeBlockquote();
return out.join("\n");
}