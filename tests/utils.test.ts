import assert from "node:assert/strict";
import test from "node:test";
import { getTargetLanguageUrl, isActive } from "@/i18n/utils";
import { buildBreadcrumbItems } from "@/utils/breadcrumbs";
import { getPath } from "@/utils/getPath";
import postFilter from "@/utils/postFilter";
import { getReadingTime } from "@/utils/readingTime";
import type { ContentEntry } from "@/utils/contentEntry";
import { slugifyAll, slugifyStr } from "@/utils/slugify";

test("slugifyStr normalizes diacritics, versions, punctuation, and unicode", () => {
  assert.equal(slugifyStr("E2E Testing"), "e2e-testing");
  assert.equal(slugifyStr("TypeScript 5.0"), "typescript-5.0");
  assert.equal(slugifyStr("Programación y Diseño's"), "programacion-y-disenos");
  assert.equal(
    slugifyStr("Modern CSS in 2026: :has()"),
    "modern-css-in-2026-has"
  );
  assert.equal(slugifyStr("日本語 テスト"), "日本語-テスト");
  assert.deepEqual(slugifyAll(["Astro 7", "Web Dev"]), ["astro-7", "web-dev"]);
});

test("getReadingTime strips frontmatter/code and formats by locale", () => {
  assert.equal(getReadingTime(""), "< 1 分钟阅读");
  assert.equal(getReadingTime("", "en"), "< 1 min read");
  assert.equal(getReadingTime("word ".repeat(400), "en"), "2 min read");
  assert.equal(getReadingTime("字".repeat(600), "zh"), "2 分钟阅读");
  assert.equal(getReadingTime("字".repeat(100), "zh"), "1 分钟阅读");

  const withCode = `---
title: Demo
---

\`\`\`ts
${"const x = 1;\n".repeat(300)}
\`\`\`

Just a short \`inlineCode()\` paragraph here.`;
  assert.equal(getReadingTime(withCode, "en"), "1 min read");
});

test("i18n helpers switch locale prefixes and match active routes", () => {
  assert.equal(getTargetLanguageUrl("/", "en"), "/en");
  assert.equal(getTargetLanguageUrl("/posts/hello", "en"), "/en/posts/hello");
  assert.equal(getTargetLanguageUrl("/en", "zh"), "/");
  assert.equal(getTargetLanguageUrl("/en/posts/hello", "zh"), "/posts/hello");

  assert.equal(isActive("/en/posts/my-article/", "/posts"), true);
  assert.equal(isActive("/archives/", "/posts"), false);
});

test("buildBreadcrumbItems translates segments and compacts pagination", () => {
  assert.deepEqual(buildBreadcrumbItems("/"), []);
  assert.deepEqual(buildBreadcrumbItems("/en/posts/2", { locale: "en" }), [
    { label: "Posts #2", href: null },
  ]);
  assert.deepEqual(buildBreadcrumbItems("/posts/2", { locale: "zh" }), [
    { label: "文章 #2", href: null },
  ]);
  assert.deepEqual(buildBreadcrumbItems("/tags/astro-v7"), [
    { label: "Tags", href: "/tags/" },
    { label: "Astro v7", href: null },
  ]);
});

test("getPath skips _-prefixed dirs and slugifies nested subdirectories", () => {
  assert.equal(
    getPath("zh/hello-world", "src/data/blog/zh/hello-world.mdx", false),
    "/hello-world"
  );
  assert.equal(
    getPath("zh/_2026/draft-note", "src/data/blog/zh/_2026/draft-note.md", false),
    "/draft-note"
  );
  assert.equal(
    getPath("en/Web Dev/mi-post", "src/data/blog/en/Web Dev/mi-post.mdx", true),
    "/posts/web-dev/mi-post"
  );
});

test("postFilter hides drafts and scheduled future posts", () => {
  const entry = (overrides: Record<string, unknown>) =>
    ({ data: { title: "t", description: "d", pubDatetime: new Date(0), ...overrides } }) as ContentEntry;

  assert.equal(postFilter(entry({ draft: true })), false);
  assert.equal(postFilter(entry({ pubDatetime: new Date(Date.now() + 86_400_000) })), false);
  assert.equal(postFilter(entry({ pubDatetime: new Date(Date.now() - 86_400_000) })), true);
});
