import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import example from "../public/examples/a-small-art-of-attention.json" with { type: "json" };
test("core screens pass automated WCAG AA checks", async ({ page }) => {
  for (const route of [
    "/",
    "/#/import",
    "/#/settings",
    "/#/help",
    "/#/notebook",
  ]) {
    await page.goto(route);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      route,
    ).toEqual([]);
  }
  await page.goto("/#/import");
  await page
    .getByLabel("Book JSON", { exact: true })
    .fill(JSON.stringify(example));
  await page.getByRole("button", { name: "Preview book" }).click();
  await page.getByRole("button", { name: "Add to library" }).click();
  await page.getByRole("link", { name: "Start reading" }).click();
  await page.getByRole("heading", { name: "An Open Window" }).waitFor();
  for (const theme of ["light", "sepia", "dark"]) {
    await page.getByRole("button", { name: "Reading appearance" }).click();
    await page.getByRole("button", { name: `Aa ${theme}` }).click();
    await page.getByRole("button", { name: "Close dialog" }).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      theme,
    ).toEqual([]);
  }
});
