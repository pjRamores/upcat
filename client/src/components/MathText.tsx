import {Fragment, type ReactNode} from "react";
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
        html = katex.renderToString(normalizeMath(tex), {
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

function normalizeMath(source: string): string {
    return source
        .trim()
    // Threat \P inside \text{...} as peso marker from imported fixtures.
    .replace(/\\text\{\\\\P\}/g, "\\text{₱}")
        // Convert common escaped delimiters to plain delimiters inside math segments.
        .replace(/\\\[/g, "[")
        .replace(/\\\]/g, "]")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
    // If uploaded content is double-escaped (e.g. \\frac), normalize command slashes.
    .replace(/\\\\([a-z]+)/g, "\\$1")
        // Normalize escaped braces from fixture payload (e.g. \\{1,2\\} -> \{1,2\}).
        .replace(/\\\\([{}])/g, "\\$1")
            // Normalize common symbol escapes from fixtures (e.g. \\% -> \%).
            .replace(/\\\\([%#$&_])/g, "\\$1")
        // Preserve LaTeX line breaks when they are double-escaped (\\\\ -> \\\\).
        .replace(/\\\\\\\\/g, "\\\\");
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function parse(text: string): ReactNode[] {
    const normalizedText = normalizeText(text);
    const parts: ReactNode[] = [];
    let key = 0;

    let index = 0;
    let plainStart = 0;

    while (index < normalizedText.length) {
        const match = findMathSegment(normalizedText, index);
        if (!match) {
            index += 1;
            continue;
        }

        if (match.start > plainStart) {
            parts.push(renderPlain(normalizedText.slice(plainStart, match.start), key++));
        }

        parts.push(renderMath(match.content, match.displayMode, `m-${key++}`));
        index = match.end;
        plainStart = match.end;
    }

    if (plainStart < normalizedText.length) {
        parts.push(renderPlain(normalizedText.slice(plainStart), key++));
    }

    return parts;
}

function normalizeText(input: string): string {
    const trimmed = input.trim();
    if (trimmed.length === 0) return input;

    // Decode escaped newlines from fixture payloads so they render as real line breaks.
    const withNewlines = input.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");

    // Support markdown-style math delimiters commonly produced by editors.
    const withDelimiters = withNewlines
        .replace(/\\\[([\s\S]*?)\\\]/g, "$$$1$$")
        .replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$");

    // Render bare set notation choices (e.g. \{1,2,3\}) as math.
    if (!hasMathDelimiters(withDelimiters) && /^\\\{[\s\S]*\\\}$/.test(trimmed)) {
        return withDelimiters.replace(trimmed, `$${trimmed}$`);
    }

    // Render standalone TeX-like payloads even when delimiters are missing.
    if (!hasMathDelimiters(withDelimiters) && looksLikeStandaloneMath(trimmed)) {
        return withDelimiters.replace(trimmed, `$${trimmed}$`);
    }

    return withDelimiters;
}

function hasMathDelimiters(value: string): boolean {
    return value.includes("$$") || value.includes("$");
}

function looksLikeStandaloneMath(value: string): boolean {
    if (/^\\+\{[\s\S]*\\+\}$/.test(value)) return true;
    if (!/[\\^_]/.test(value)) return false;
    if (/^[A-Za-z][A-Za-z0-9\s.,!?'-]*$/.test(value)) return false;

    return /\\[A-Za-z]+/.test(value) || /[\d)}\]]\s*[\^_]/.test(value);
}

function findMathSegment(value: string, fromIndex: number): {
    start: number;
    end: number;
    content: string;
    displayMode: boolean;
} | null {
    const candidates: Array<{ start: number; open: string; close: string; displayMode: boolean }> = [
        {start: value.indexOf("$$", fromIndex), open: "$$", close: "$$", displayMode: true},
        {start: value.indexOf("$", fromIndex), open: "$", close: "$", displayMode: false},
        {start: value.indexOf("\\[", fromIndex), open: "\\[", close: "\\]", displayMode: true},
        {start: value.indexOf("\\(", fromIndex), open: "\\(", close: "\\)", displayMode: false},
    ].filter((c) => c.start >= 0);

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => a.start - b.start);

    for (const candidate of candidates) {
        if (candidate.open === "$" && value.slice(candidate.start, candidate.start + 2) === "$$") {
            continue;
        }

        if (isEscaped(value, candidate.start)) {
            continue;
        }

        const closeIndex = findClosingDelimiter(
            value,
            candidate.close,
            candidate.start + candidate.open.length,
        );
        if (closeIndex < 0) continue;

        return {
            start: candidate.start,
            end: closeIndex + candidate.close.length,
            content: value.slice(candidate.start + candidate.open.length, closeIndex),
            displayMode: candidate.displayMode,
        };
    }

    return null;
}

function findClosingDelimiter(value: string, delimiter: string, fromIndex: number): number {
    let index = fromIndex;
    while (index < value.length) {
        index = value.indexOf(delimiter, index);
        if (index < 0) return -1;
        if (!isEscaped(value, index)) return index;
        index += delimiter.length;
    }
    return -1;
}

function isEscaped(value: string, index: number): boolean {
    let slashCount = 0;
    let cursor = index - 1;
    while (cursor >= 0 && value[cursor] === "\\") {
        slashCount += 1;
        cursor -= 1;
    }
    return slashCount % 2 === 1;
}

function renderPlain(text: string, key: number): ReactNode {
    const lines = text.split(/\n/);

    return (
        <Fragment key={`t-${key}`}>
            {lines.map((line, i) => (
                <Fragment key={i}>
                    {line}
                    {i < lines.length - 1 && <br/>}
                </Fragment>
            ))}
        </Fragment>
    );
}
