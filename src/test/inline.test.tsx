import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { InlineText } from "../components/InlineText";
import { segmentFor } from "../services/anchors";
import { plainText } from "../services/markdown";
describe("safe React highlighting", () => {
  it("renders formatted text while keeping unsafe HTML inert", () => {
    const { container } = render(
      <InlineText
        text={
          "**Bright** <img src=x onerror=alert(1)> [safe](https://example.org) [bad](javascript:alert)"
        }
      />,
    );
    expect(container.querySelector("strong")?.textContent).toBe("Bright");
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("link").getAttribute("rel")).toContain("noopener");
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });
  it("supports overlap and formatting without changing the text stream", () => {
    const text = "A **bright** little thought",
      plain = plainText(text);
    const { container, rerender } = render(
      <InlineText
        text={text}
        segments={[segmentFor("p", plain, 2, 8), segmentFor("p", plain, 5, 15)]}
      />,
    );
    expect(container.textContent).toBe(plain);
    expect(container.querySelectorAll("mark").length).toBeGreaterThan(1);
    expect(container.querySelector("strong mark")?.textContent).toBeTruthy();
    rerender(<InlineText text={text} />);
    expect(container.textContent).toBe(plain);
    expect(container.querySelector("mark")).toBeNull();
  });
});
