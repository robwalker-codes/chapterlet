import { Fragment, type ReactNode } from "react";
import { inline, type Inline } from "../services/markdown";
import { reanchor } from "../services/anchors";
import { plainText } from "../services/markdown";
import type { Segment } from "../models/types";
export function InlineText({
  text,
  segments = [],
}: {
  text: string;
  segments?: Segment[];
}) {
  const ranges = segments
    .map((s) => reanchor(s, plainText(text)))
    .filter((s) => s !== null);
  let offset = 0;
  function render(nodes: Inline[]): ReactNode {
    return nodes.map((n, index) => {
      if (n.text !== undefined) {
        const start = offset;
        offset += n.text.length;
        const boundaries = [
          ...new Set([
            0,
            n.text.length,
            ...ranges.flatMap((r) => [
              Math.max(0, Math.min(n.text!.length, r.start - start)),
              Math.max(0, Math.min(n.text!.length, r.end - start)),
            ]),
          ]),
        ].sort((a, b) => a - b);
        return (
          <Fragment key={index}>
            {boundaries.slice(0, -1).map((a, i) => {
              const b = boundaries[i + 1],
                value = n.text!.slice(a, b);
              return ranges.some(
                (r) => r.start < start + b && r.end > start + a,
              ) ? (
                <mark key={a}>{value}</mark>
              ) : (
                <Fragment key={a}>{value}</Fragment>
              );
            })}
          </Fragment>
        );
      }
      const children = render(n.children ?? []);
      switch (n.kind) {
        case "strong":
          return <strong key={index}>{children}</strong>;
        case "em":
          return <em key={index}>{children}</em>;
        case "code":
          return <code key={index}>{children}</code>;
        case "a":
          return (
            <a
              key={index}
              href={n.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          );
        default:
          return children;
      }
    });
  }
  return <>{render(inline(text))}</>;
}
