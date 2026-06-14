import { Fragment, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Render a string that may contain LaTeX delimited by:
 * \$\$...\$\$ - block math
 * \$...\$ - inline math
 * Plain text segments preserve newlines via <br/>.
 */
export default function MathText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return <span className={className}>{parse(children)}</span>;
}

function renderMath(tex: string, displayMode: boolean, key: string): ReactNode {
  let html: string;

  try {
    html = katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      errorColor: "#dc2626",
    });
  } catch {
    html = `<span style="color:#dc2626">${escapeHtml(tex)}</span>`;
  }

  return (
    <span
      key={key}
      style={displayMode ? { display: "block", margin: "0.5em 0" } : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parse(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Supports multiline \$\$...\$\$ and single-line \$...\$
  const regex = /\\$\\$([\s\S]+?)\\$\\$|\\$([^\$\n]+?)\\$/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderPlain(text.slice(lastIndex, match.index), key++));
    }

    if (match !== undefined) {
      parts.push(renderMath(match.trim(), true, `b-${key++}`));
    } else if (match !== undefined) {
      parts.push(renderMath(match.trim(), false, `i-${key++}`));
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(renderPlain(text.slice(lastIndex), key++));
  }

  return parts;
}

function renderPlain(text: string, key: number): ReactNode {
  const lines = text.split(/\n/);

  return (
    <Fragment key={`t-${key}`}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </Fragment>
  );
}
