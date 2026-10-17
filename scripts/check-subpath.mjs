import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { chromium, expect } from "@playwright/test";
const build = spawnSync(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "build",
    "--outDir",
    "work/subpath/chapterlet",
  ],
  { env: { ...process.env, BASE_PATH: "/chapterlet/" }, stdio: "inherit" },
);
if (build.status !== 0) process.exit(build.status ?? 1);
const root = resolve("work/subpath");
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const target = resolve(
      root,
      `.${pathname}${pathname.endsWith("/") ? "index.html" : ""}`,
    );
    if (!target.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    const bytes = await readFile(target);
    res.setHeader(
      "Content-Type",
      mime[extname(target)] ?? "application/octet-stream",
    );
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/chapterlet/`;
let browser;
try {
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const failed = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(r.url());
  });
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Your library" }),
  ).toBeVisible();
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector("link[rel=manifest]").href;
    return (await fetch(href)).json();
  });
  expect(manifest.scope).toBe("/chapterlet/");
  expect(manifest.start_url).toBe("/chapterlet/");
  await page.getByRole("link", { name: "Import your first book" }).click();
  await page
    .getByLabel("Book JSON", { exact: true })
    .fill(
      await readFile("public/examples/a-small-art-of-attention.json", "utf8"),
    );
  await page.getByRole("button", { name: "Preview book" }).click();
  await page.getByRole("button", { name: "Add to library" }).click();
  await page.getByRole("link", { name: "Start reading" }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "An Open Window" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Bookmark chapter", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remove chapter bookmark", exact: true }),
  ).toBeVisible();
  expect(failed).toEqual([]);
  console.log(
    "Subpath production smoke passed: scoped manifest, assets, offline reload, and persistent bookmark.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
