import {Fragment, type ReactNode} from "react";
import ReactMarkdown, {type Components} from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Render admin-authored content that may combine GitHub-Flavored Markdown
 * (bold, italic, code, lists, links, tables, strikethrough, blockquotes,
 * headings) with LaTeX math delimited by:
 *   $$...$$   block math
 *   $...$     inline math
 *
 * Math is parsed by remark-math and rendered with KaTeX (rehype-katex).
 * A normalization pass first repairs double-escaped payloads produced by
 * imported question fixtures so legacy content keeps rendering correctly.
 *
 * Set `inline` for short snippets (e.g. answer choices) so paragraphs do
 * not introduce block margins and the output stays on one line.
 */
export default function MathText({
                                    children,
                                    className,
                                    inline = false,
                                }: {
    children: string;
    className?: string;
    inline?: boolean;
}) {
	const source = normalizeSource(children ?? "");
	const components = inline ? INLINE_COMPONENTS : BLOCK_COMPONENTS;

	const markdown = (
		<ReactMarkdown
			remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
			rehypePlugins={[rehypeKatex]}
			components={components}
		>
			{source}
		</ReactMarkdown>
	);

	return inline ? (
		<span className={className}>{markdown}</span>
	) : (
		<div className={className}>{markdown}</div>
	);
}

// --- Markdown element styling --------------------------------------------
function isFencedCode(className: string | undefined): boolean {
	return typeof className === "string" && /\blanguage-./.test(className);
}
const BASE_COMPONENTS: Components = {
    a: ({node: _node, ...props}) => (
        <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 underline hover:text-primary-700"
        />
    ),
    strong: ({node: _node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
    em: ({node: _node, ...props}) => <em className="italic" {...props} />,
    del: ({node: _node, ...props}) => <del className="line-through" {...props} />,
    code: ({node: _node, className, children, ...props}) =>
        isFencedCode(className) ? (
            <code className={className} {...props}>
                {children}
            </code>
        ) : (
            <code
                className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.9em] text-gray-800"
                {...props}
            >
                {children}
            </code>
        ),
    pre: ({node: _node, ...props}) => (
        <pre
            className="mb-3 overflow-x-auto rounded-md bg-gray-100 p-3 font-mono text-sm text-gray-800"
            {...props}
        />
    ),
    ul: ({node: _node, ...props}) => (
        <ul className="mb-3 list-disc space-y-1 pl-6 last:mb-0" {...props} />
    ),
    ol: ({node: _node, ...props}) => (
        <ol className="mb-3 list-decimal space-y-1 pl-6 last:mb-0" {...props} />
    ),
    li: ({node: _node, ...props}) => <li className="leading-relaxed" {...props} />,
    blockquote: ({node: _node, ...props}) => (
        <blockquote
            className="mb-3 border-l-4 border-gray-300 pl-4 italic text-gray-600 last:mb-0"
            {...props}
        />
    ),
    h1: ({node: _node, ...props}) => <h1 className="mb-3 text-2xl font-bold" {...props} />,
    h2: ({node: _node, ...props}) => <h2 className="mb-3 text-xl font-bold" {...props} />,
    h3: ({node: _node, ...props}) => <h3 className="mb-2 text-lg font-semibold" {...props} />,
    h4: ({node: _node, ...props}) => <h4 className="mb-2 text-base font-semibold" {...props} />,
    hr: ({node: _node, ...props}) => <hr className="my-4 border-gray-200" {...props} />,
    img: ({node: _node, ...props}) => (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img className="my-2 h-auto max-w-full rounded" loading="lazy" {...props} />
    ),
    table: ({node: _node, ...props}) => (
        <div className="mb-3 overflow-x-auto last:mb-0">
            <table className="w-full border-collapse text-sm" {...props} />
        </div>
    ),
    thead: ({node: _node, ...props}) => <thead className="bg-gray-50" {...props} />,
    th: ({node: _node, ...props}) => (
        <th
            className="border border-gray-300 px-3 py-1.5 text-left font-semibold"
            {...props}
        />
    ),
    td: ({node: _node, ...props}) => (
        <td className="border border-gray-300 px-3 py-1.5" {...props} />
    ),
};

const BLOCK_COMPONENTS: Components = {
    ...BASE_COMPONENTS,
    p: ({node: _node, ...props}) => <p className="mb-3 leading-relaxed last:mb-0" {...props} />,
};

const INLINE_COMPONENTS: Components = {
    ...BASE_COMPONENTS,
    // In inline contexts (answer choices) paragraphs must not add block margins.
    p: ({node: _node, children}) => <Fragment>{children as ReactNode}</Fragment>,
};
// --- Source normalization (repairs imported fixture payloads) -------

/**
 * Repairs legacy/double-escaped content so remark-math + KaTeX can parse it,
 * then hands a clean Markdown string to react-markdown.
 */
function normalizeSource(input: string): string {
    if (!input) return "";
    const trimmed = input.trim();
    if (trimmed.length === 0) return input;

    // 1. Decode escaped newlines from fixture payloads into real line breaks.
    let out = input.replace(/\r\n/g, "\n").replace(/\n/g, "\n");

    // 2. Repair double-escaped LaTeX so KaTeX can parse it.
    out = out
        .replace(/\\text\{\\\P\}/g, "\\text{P}")
        .replace(/\\\\([a-zA-Z]+)/g, "\$1")
        .replace(/\\\(/{/g, "\$1")
        .replace(/\\\(/{/g, "\$1");

    // 3. Convert alternate math delimiters to $ / $$ for remark-math.
    out = out
        .replace(/\[\{(\s\S*)\}\]/g, "$$${1}$$")
        .replace(/\[\{(\s\S*)\}\]/g, "$$${1}$$");

    // 3b. Repair inline math whose outer $ delimiters were dropped, leaving
    //     raw LaTeX outside math spans (e.g. `x \le -1` or `$x \ge 6`). Without
    //     this, remark-math would treat the plain text between the two inner
    //     `$` as math and leak the surrounding `\le`/`\ge` as literal text.
    if (hasMathDelimiters(out) && hasRawLatexOutsideMath(out)) {
        out = repairMisplacedMathDelimiters(out);
    }

    // 4. Auto-wrap standalone math values that arrive without delimiters
    //    (common for answer choices such as `360^\circ` or `\{-1, 3\}`).
    const outTrimmed = out.trim();
    if (!hasMathDelimiters(out)) {
        if (/\\{[\s\S]*\}/.test(outTrimmed) || looksLikeStandaloneMath(outTrimmed)) {
            return out.replace(outTrimmed, `$$${outTrimmed}$$`);
        }
    }

    return out;
}

function hasMathDelimiters(value: string): boolean {
    return value.includes("$");
}

/**
 * Matches a LaTeX command such as `\le`, `\ge`, or `\frac`.
 */
const RAW_LATEX_COMMAND = /\\[a-zA-Z]+/;

/**
 * Detects the "dropped outer delimiter" pattern: a string with balanced inline
 * `$` delimiters where raw LaTeX commands appear in the segments that sit
 * outside* the math spans (even indices once split on `$`). Block math (`$$`)
 * and unbalanced delimiters are left untouched to stay safe.
 */
function hasRawLatexOutsideMath(value: string): boolean {
    if (value.includes("$$")) return false;

    const segments = value.split("$");
    // Balanced inline `$` produce an odd number of segments; anything else is
    // ambiguous, so we do not attempt a repair.
    if (segments.length % 2 === 0) return false;

    return outsideMathSegments(segments).some((segment) => RAW_LATEX_COMMAND.test(segment));
}
/**
 * Repairs misplaced inline delimiters by wrapping the value in outer `$...$`,
 * which flips each segment's inside/outside role. Only returns the repaired
 * string when it results in a clean structure (no raw LaTeX left outside math);
 * otherwise the original value is returned unchanged.
 */
function repairMisplacedMathDelimiters(value: string): string {
    const wrapped = `$$${value}$`;
    const segments = wrapped.split("$");
    if (outsideMathSegments(segments).some((segment) => RAW_LATEX_COMMAND.test(segment))) {
        return value;
    }

    return wrapped;
}

/** Returns the segments that sit outside inline math spans (even indices). */
function outsideMathSegments(segments: string[]): string[] {
    return segments.filter((_segment, index) => index % 2 === 0);
}

function looksLikeStandaloneMath(value: string): boolean {
    if (/^\+\{[\s\S]*\+\}$/.test(value)) return true;
    if (!/[\\^_]/.test(value)) return false;
    if (/\^[A-Za-z] [A-Za-z0-9\s.,!?'-]*$/.test(value)) return false;

    return /\`\[A-Za-z]+/.test(value) || /[\d\}]\] \s*[^_] /.test(value);
}