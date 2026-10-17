export interface Inline {
  text?: string;
  kind?: "strong" | "em" | "code" | "a";
  href?: string;
  children?: Inline[];
}
export function safeLink(url: string): boolean {
  try {
    return ["https:", "http:", "mailto:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
/** Deliberately small inline grammar. Raw HTML and images remain literal text. */
export function inline(source: string, depth = 0): Inline[] {
  if (depth > 8) return [{ text: source }];
  const pattern =
    /(`[^`\n]+`|\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\))/g;
  const nodes: Inline[] = [];
  let last = 0;
  for (const m of source.matchAll(pattern)) {
    const at = m.index!;
    if (at > last) nodes.push({ text: source.slice(last, at) });
    const s = m[0];
    if (s.startsWith("`"))
      nodes.push({ kind: "code", children: [{ text: s.slice(1, -1) }] });
    else if (s.startsWith("**"))
      nodes.push({
        kind: "strong",
        children: inline(s.slice(2, -2), depth + 1),
      });
    else if (s.startsWith("*"))
      nodes.push({ kind: "em", children: inline(s.slice(1, -1), depth + 1) });
    else {
      const split = s.indexOf("](");
      const href = s.slice(split + 2, -1);
      nodes.push(
        safeLink(href)
          ? { kind: "a", href, children: inline(s.slice(1, split), depth + 1) }
          : { text: s },
      );
    }
    last = at + s.length;
  }
  if (last < source.length) nodes.push({ text: source.slice(last) });
  return nodes;
}
export function plainText(source: string): string {
  const flatten = (nodes: Inline[]): string =>
    nodes.map((n) => n.text ?? flatten(n.children ?? [])).join("");
  return flatten(inline(source));
}
