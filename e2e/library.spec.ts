import { test, expect, type Page } from "@playwright/test";
import example from "../public/examples/a-small-art-of-attention.json" with { type: "json" };
async function importExample(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Import your first book" }).click();
  await page
    .getByLabel("Book JSON", { exact: true })
    .fill(JSON.stringify(example));
  await page.getByRole("button", { name: "Preview book" }).click();
  await expect(
    page.getByRole("heading", { name: example.title }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to library" }).click();
  await expect(page.getByRole("link", { name: "Start reading" })).toBeVisible();
}
async function selectPhrase(page: Page) {
  await page
    .locator(".paragraphs p")
    .nth(1)
    .evaluate((element) => {
      const strong = element.querySelector("strong")!;
      const range = document.createRange();
      range.selectNodeContents(strong);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
  await expect(
    page.getByRole("button", { name: "Highlight", exact: true }),
  ).toBeVisible();
}
test("empty library, preview validation, and duplicate protection", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your library" }),
  ).toBeVisible();
  await expect(page.locator(".book-card")).toHaveCount(0);
  await page.getByRole("link", { name: "Import your first book" }).click();
  await page
    .getByLabel("Book JSON", { exact: true })
    .fill('{"schemaVersion":99}');
  await page.getByRole("button", { name: "Preview book" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Unsupported schemaVersion",
  );
  await importExample(page);
  await page.goto("/#/import");
  await page
    .getByLabel("Book JSON", { exact: true })
    .fill(JSON.stringify(example));
  await page.getByRole("button", { name: "Preview book" }).click();
  await expect(
    page.getByRole("button", { name: "Add to library" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Add to library" }).click();
  await page.getByRole("link", { name: "Your library", exact: true }).click();
  await expect(page.locator(".book-card")).toHaveCount(2);
});
test("reader selection, chapter bookmark, note, preferences, and position survive reload", async ({
  page,
}) => {
  await importExample(page);
  await page.getByRole("link", { name: "Start reading" }).click();
  await expect(
    page.getByRole("heading", { name: "An Open Window" }),
  ).toBeVisible();
  await selectPhrase(page);
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Highlight", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("mark")).toContainText([
    "Attention is a small act of welcome.",
  ]);
  await page
    .getByRole("button", { name: "Bookmark chapter", exact: true })
    .click();
  await page.getByRole("button", { name: "Reading appearance" }).click();
  await page.getByRole("button", { name: "Aa sepia" }).click();
  await page.getByLabel("Font size", { exact: true }).fill("24");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(page.locator(".reader")).toHaveClass(/theme-sepia/);
  await expect(page.locator("mark")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove chapter bookmark", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Notebook", exact: true }).click();
  await page.getByLabel("Annotation type").selectOption("highlight");
  await page.getByRole("button", { name: "Add note" }).click();
  await page
    .getByLabel("Your note")
    .fill("A thought worth keeping.\nA second paragraph.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".saved-note")).toContainText(
    "A second paragraph.",
  );
  await page
    .locator(".annotation")
    .filter({ has: page.locator(".saved-note") })
    .locator(".annotation-context")
    .click();
  await expect(page.locator("mark")).toBeVisible();
  await page.getByRole("link", { name: /NEXT CHAPTER/ }).click();
  await expect(
    page.getByRole("heading", { name: "The Margin of a Page" }),
  ).toBeVisible();
  await page
    .locator(".paragraphs p")
    .nth(2)
    .evaluate((p) => p.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(900);
  const anchoredId = await page
    .locator(".paragraphs p")
    .nth(2)
    .getAttribute("id");
  const originalViewport = page.viewportSize()!;
  await page.setViewportSize({
    width: originalViewport.height,
    height: originalViewport.width,
  });
  await expect
    .poll(async () =>
      page.locator(`[id="${anchoredId}"]`).evaluate((el) => {
        const top = el.getBoundingClientRect().top;
        const maximumScroll = Math.max(
          0,
          document.documentElement.scrollHeight - innerHeight,
        );
        const expected = Math.max(100, top + scrollY - maximumScroll);
        return Math.abs(top - expected);
      }),
    )
    .toBeLessThan(15);
  await page.setViewportSize(originalViewport);
  await expect
    .poll(async () =>
      page.locator(`[id="${anchoredId}"]`).evaluate((el) => {
        const top = el.getBoundingClientRect().top;
        const maximumScroll = Math.max(
          0,
          document.documentElement.scrollHeight - innerHeight,
        );
        const expected = Math.max(100, top + scrollY - maximumScroll);
        return Math.abs(top - expected);
      }),
    )
    .toBeLessThan(15);
  await page.reload();
  await expect
    .poll(async () =>
      page.locator(`[id="${anchoredId}"]`).evaluate((el) => {
        const top = el.getBoundingClientRect().top;
        const maximumScroll = Math.max(
          0,
          document.documentElement.scrollHeight - innerHeight,
        );
        const expected = Math.max(100, top + scrollY - maximumScroll);
        return Math.abs(top - expected);
      }),
    )
    .toBeLessThan(15);
  await expect(
    page.getByRole("heading", { name: "The Margin of a Page" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to book" }).click();
  await page.getByRole("link", { name: "Continue reading" }).click();
  await expect(
    page.getByRole("heading", { name: "The Margin of a Page" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Notebook", exact: true }).click();
  await page.getByRole("button", { name: "Delete note", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".saved-note")).toHaveCount(0);
  await page.getByLabel("Annotation type").selectOption("highlight");
  await expect(page.locator(".annotation")).toHaveCount(1);
  await page.locator(".annotation-context").click();
  await expect(page.locator("mark")).toBeVisible();
});
test("backup export, clean restore, text search, and deletion", async ({
  page,
}) => {
  await importExample(page);
  await page.getByRole("link", { name: "Start reading" }).click();
  await page
    .getByRole("button", { name: "Bookmark chapter", exact: true })
    .click();
  await page.getByRole("button", { name: "Add a chapter note" }).click();
  await page.getByLabel("Your note").fill("Remember this chapter.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/#/settings");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export library backup", exact: true })
    .click();
  const downloaded = await downloading;
  const path = await downloaded.path();
  expect(path).toBeTruthy();
  await page
    .getByRole("button", { name: "Clear all local data", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page
    .getByLabel("Restore library backup", { exact: true })
    .setInputFiles(path!);
  await expect(
    page.getByRole("heading", { name: "Ready to restore" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore backup", exact: true })
    .click();
  await expect(
    page.getByText("Library backup restored.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Notebook", exact: true }).click();
  await expect(page.locator(".saved-note")).toContainText(
    "Remember this chapter.",
  );
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await page.getByLabel("Search in").selectOption("text");
  await page
    .getByLabel("Search library", { exact: true })
    .fill("generous pauses");
  await page.locator(".search-result").click();
  await expect(
    page.getByRole("heading", { name: "The Margin of a Page" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to book" }).click();
  await page.getByRole("button", { name: "Delete book", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Import your first book" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Notebook", exact: true }).click();
  await expect(page.locator(".annotation")).toHaveCount(0);
});
test("production service worker supports offline reload, import, annotations, and backup", async ({
  page,
  context,
}) => {
  await importExample(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
    });
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("link", { name: "Start reading" }).click();
  await page
    .getByRole("button", { name: "Bookmark chapter", exact: true })
    .click();
  await page.getByRole("button", { name: "Add a chapter note" }).click();
  await page.getByLabel("Your note").fill("Written offline.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remove chapter bookmark", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".reader-note")).toContainText("Written offline.");
  await page.goto("/#/import");
  await page
    .getByLabel("Book JSON", { exact: true })
    .fill(JSON.stringify({ ...example, title: "Another offline book" }));
  await page.getByRole("button", { name: "Preview book" }).click();
  await page.getByRole("button", { name: "Add to library" }).click();
  await expect(
    page.getByRole("heading", { name: "Another offline book" }),
  ).toBeVisible();
  await page.goto("/#/settings");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export library backup", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/chapterlet-backup/);
});
test("responsive layout and local-only runtime requests", async ({
  page,
}, testInfo) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your library" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("empty-library.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await importExample(page);
  await page.getByRole("link", { name: "Your library", exact: true }).click();
  await expect(page.locator(".book-card")).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath("populated-library.png"),
    fullPage: true,
  });
  expect(
    requests.filter(
      (url) =>
        !url.startsWith("http://127.0.0.1:4173") && !url.startsWith("data:"),
    ),
  ).toEqual([]);
});

test("multi-paragraph highlights, attached notes, and overlapping removal", async ({
  page,
}) => {
  await importExample(page);
  await page.getByRole("link", { name: "Start reading" }).click();
  await page.locator(".paragraphs").evaluate((root) => {
    const ps = root.querySelectorAll("p"),
      r = document.createRange();
    r.setStart(ps[0].firstChild!, 7);
    r.setEnd(ps[1].querySelector("strong")!.firstChild!, 9);
    const s = window.getSelection()!;
    s.removeAllRanges();
    s.addRange(r);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Highlight", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".paragraphs p").nth(0).locator("mark"),
  ).toHaveCount(1);
  await expect(
    page.locator(".paragraphs p").nth(1).locator("mark"),
  ).toHaveCount(1);
  await selectPhrase(page);
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Highlight", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.locator(".paragraphs p").nth(0).locator("mark"),
  ).toHaveCount(1);
  await page.getByRole("link", { name: "Notebook", exact: true }).click();
  await expect(page.locator(".annotation")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Delete highlight", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".annotation")).toHaveCount(1);
  await page.locator(".annotation-context").click();
  await expect(
    page.locator(".paragraphs p").nth(0).locator("mark"),
  ).toHaveCount(1);
});

test("image covers survive book export and backup replacement; damaged images are rejected", async ({
  page,
}) => {
  await importExample(page);
  await page
    .getByLabel("Change cover", { exact: true })
    .setInputFiles("public/icons/icon-192.png");
  await expect(page.locator(".book-details .cover img")).toBeVisible();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export book", exact: true }).click();
  const bookFile = await (await exported).path();
  await page.goto("/#/import");
  await page
    .getByLabel("Choose book JSON", { exact: true })
    .setInputFiles(bookFile!);
  await expect(page.locator(".import-preview .cover img")).toBeVisible();
  await page.goto("/#/settings");
  const backup = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export library backup", exact: true })
    .click();
  const backupFile = await (await backup).path();
  await page
    .getByLabel("Restore library backup", { exact: true })
    .setInputFiles(backupFile!);
  await page.getByLabel("Restore method").selectOption("replace");
  await page
    .getByRole("button", { name: "Restore backup", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByText("Library backup restored.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page.locator(".book-card .cover img")).toBeVisible();
  await page.goto("/#/import");
  await page.getByLabel("Book JSON", { exact: true }).fill(
    JSON.stringify({
      ...example,
      title: "Invalid image",
      coverImageDataUrl: "data:image/png;base64,iVBORw0KGgo=",
    }),
  );
  await page.getByRole("button", { name: "Preview book" }).click();
  await page.getByRole("button", { name: "Add to library" }).click();
  await expect(page.getByRole("alert")).toContainText("damaged");
});

test("keyboard dialog focus and 320-pixel layouts", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await importExample(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Start reading" }).click();
  await page.getByRole("button", { name: "Reading appearance" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reading appearance" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const route of ["/import", "/settings", "/help", "/notebook"]) {
    await page.goto(`/#${route}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
  }
});

test("unsaved notes survive cancelled browser-back navigation", async ({
  page,
}) => {
  await importExample(page);
  await page.getByRole("link", { name: "Start reading" }).click();
  await page.getByRole("button", { name: "Add a chapter note" }).click();
  await page
    .getByLabel("Your note")
    .fill("A substantial thought I am still editing.");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.goBack();
  await expect(page.getByLabel("Your note")).toHaveValue(
    "A substantial thought I am still editing.",
  );
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".reader-note")).toContainText(
    "A substantial thought",
  );
});
