/**
 * Minimal, dependency-free, safe markdown → HTML renderer.
 *
 * Supports the limited subset used by the blog:
 * - Headings (#, ##, ###)
 * - Paragraphs
 * - Bold (**text**), italic (*text* or _text_)
 * - Inline code (`code`)
 * - Fenced code blocks (```)
 * - Unordered lists (- item) and ordered lists (1. item)
 * - Blockquotes (> quote)
 * - Links [text](https://url) — only http(s) URLs are accepted
 * - Images ![alt](https://url) or ![alt](/path)
 * - Tables
 * - Horizontal rule (----)
 *
 * All input is HTML-escaped before tokens are recognised, so a hostile post body
 * can not inject raw HTML or javascript: URLs. The output is trusted only
 * because of this escaping pass.
 */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]!);
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
  return cells.every((cell) => /^:?-{3,}:?\$/.test(cell));
}

function renderInline(line: string): string {
  let s = escapeHtml(line);

  // Preserve code spans so later replacements do not touch them.
  const codeTokens: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_m, code: string) => {
    const token = `\u0000CODE${codeTokens.length}\u0000`;
    codeTokens.push(`<code>${code}</code>`);
    return token;
  });

  // Callout labels used in seeded help articles, usually inside blockquotes.
  s = s.replace(/\!$$(note|warning|info)$$/gi, (_m, kind: string) => {
    return `<strong>${kind.toUpperCase()}:</strong>`;
  });

  // Images ![alt](src) — http/https and absolute-root relative paths only.
  s = s.replace(/!$$([^$$]*)\]$((?:https?:\/\/|\/)[^) \t]+)$/g,(_m, alt: string, src: string) =>
      `<img src="${src}" alt="${alt}" loading="lazy" />`,
  );

  // Links [text](href) — http/https and absolute-root relative paths only.
  s = s.replace(/$$([^$$]+)\]$((?:https?:\/\/|\/)[^) \t]+)$/g,
    (_m, text: string, href: string) =>
      `<a href="${href}" rel="noopener noreferrer"${href.startsWith("http") ? ' target="_blank"' : ""}>${text}</a>`,
  );

  // Bold.
  s = s.replace(/\*\*([^\n*]+(?:\*[^*\n]+)*)\*\*/g, "<strong>$1</strong>");

  // Italic with underscores, avoiding common mid-word false positives.
  s = s.replace(/(^|[\s(>])_([^_\n]+)_((?=[\s).,!?:;]|\$))/g, "$1<em>$2</em>$3");

  // Italic with asterisks, avoiding common mid-word false positives.
  s = s.replace(/(^|[\s(>])\*([^*\n]+)\*((?=[\s).,!?:;]|\$))/g, "$1<em>$2</em>$3");

  // Restore code spans.
  s = s.replace(/\u0000CODE(\d+)\u0000/g, (_m, idx: string) => codeTokens[Number(idx)]!);

  return s;
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];

  let i = 0;
  let inUL = false;
  let inOL = false;
  let inBlockquote = false;
  let paraBuf: string[] = [];

  function flushPara() {
    if (paraBuf.length) {
      out.push(`<p>${paraBuf.map(renderInline).join(" ")}</p>`);
      paraBuf = [];
    }
  }

  function closeLists() {
    if (inUL) {
      out.push("</ul>");
      inUL = false;
    }
    if (inOL) {
      out.push("</ol>");
      inOL = false;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      out.push("</blockquote>");
      inBlockquote = false;
    }
  }

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block.
    if (/^```/.test(line)) {
      flushPara();
      closeLists();
      closeBlockquote();

      const code: string[] = [];
      i++;

      while (i < lines.length && !/^```/.test(lines[i]!)) {
        code.push(lines[i]!);
        i++;
      }

      if (i < lines.length) {
        i++; // skip closing fence
      }

      out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    // Headings.
    const h = /^(#{1,3})\s+(.+)\$/.exec(line);
    if (h) {
      flushPara();
      closeLists();
      closeBlockquote();

      const level = h.length;
      out.push(`<h${level}>${renderInline(h!)}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule.
    if (/^----+\s*\$/.test(line)) {
      flushPara();
      closeLists();
      closeBlockquote();
      out.push("<hr />");
      i++;
      continue;
    }

    // Table: header row + separator row + data rows.
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1]!)) {
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

      while (i < lines.length && lines[i]!.includes("|") && !/^\s*\$/.test(lines[i]!)) {
        const row = splitTableRow(lines[i]!);
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
    const ul = /^[-*]\s+(.+)\$/.exec(line);
    if (ul) {
      flushPara();
      closeBlockquote();

      if (inOL) {
        out.push("</ol>");
        inOL = false;
      }
      if (!inUL) {
        out.push("<ul>");
        inUL = true;
      }

      out.push(`<li>${renderInline(ul!)}</li>`);
      i++;
      continue;
    }

    // Ordered list.
    const ol = /^\d+\.\s+(.+)\$/.exec(line);
    if (ol) {
      flushPara();
      closeBlockquote();

      if (inUL) {
        out.push("</ul>");
        inUL = false;
      }
      if (!inOL) {
        out.push("<ol>");
        inOL = true;
      }

      out.push(`<li>${renderInline(ol!)}</li>`);
      i++;
      continue;
    }

    // Blockquote.
    const bq = /^>\s?(.*)\$/.exec(line);
    if (bq) {
      flushPara();
      closeLists();

      if (!inBlockquote) {
        out.push("<blockquote>");
        inBlockquote = true;
      }

      out.push(`<p>${renderInline(bq!)}</p>`);
      i++;
      continue;
    }

    // Blank line.
    if (/^\s*\$/.test(line)) {
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
