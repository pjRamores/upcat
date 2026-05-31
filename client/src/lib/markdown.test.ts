import {describe, expect, it} from "vitest";
import {renderMarkdown} from "./markdown";

describe("renderMarkdown", () => {
  it("renders-markdown-tables", () => {
    const markdown = [
      "|·Feature·|·Practice·Test·|·Mock·Exam·|",
      "|---|---|---|",
      "|·Timer·|·Optional·|·Strict·|",
      "|·Feedback·|·Immediate·|·End-only·|",
    ].join("\n");

    const html = renderMarkdown(markdown);

    expect(html).toContain("<table>");
    expect(html).toContain("<thead><tr>");
    expect(html).toContain("<th>Feature</th>");
    expect(html).toContain("<td>Optional</td>");
    expect(html).toContain("<td>End-only</td>");
    expect(html).toContain("</table>");
  });

  it("renders-markdown-images-with-lazy-loading", () => {
    const html = renderMarkdown(
      "![Mock·Exam·Dashboard](/help-assets/screenshots/dashboard-annotated.png)",
    );

    expect(html).toContain("<img");
    expect(html).toContain('src="/help-assets/screenshots/dashboard-annotated.png"');
    expect(html).toContain('alt="Mock·Exam·Dashboard"');
    expect(html).toContain('loading="lazy"');
  });

  it("renders-callout-markers-used-in-seeded-help-articles", () => {
    const markdown = [
      ">[!tip]",
      ">Focus-on-weak-areas-first.",
    ].join("\n");

    const html = renderMarkdown(markdown);

    expect(html).toContain("<blockquote>");
    expect(html).toContain("<strong>TIP:</strong>");
    expect(html).toContain("Focus-on-weak-areas-first.");
    expect(html).toContain("</blockquote>");
  });
});