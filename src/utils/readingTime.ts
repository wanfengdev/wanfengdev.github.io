/**
 * Calculates the estimated reading time for a given piece of text.
 * Strips markdown/MDX syntax before counting words for a more accurate result.
 * Chinese text is counted by characters (~300 chars/min), other locales by words.
 *
 * @param body - Raw markdown/MDX string content
 * @param locale - Content locale (default: zh)
 * @param wordsPerMinute - Average reading speed (default: 200 wpm)
 * @returns Formatted string like "3 min read" / "3 分钟阅读"
 */
export function getReadingTime(
  body: string,
  locale = "zh",
  wordsPerMinute = 200
): string {
  // Strip frontmatter
  const withoutFrontmatter = body.replace(/^---[\s\S]*?---\n?/, "");

  // Strip common markdown/MDX syntax that isn't real words
  const plainText = withoutFrontmatter
    .replace(/```[\s\S]*?```/g, "") // fenced code blocks
    .replace(/`[^`]*`/g, "") // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // links → keep link text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // bold/italic
    .replace(/^\s*[-*+>|]\s*/gm, "") // lists, blockquotes, tables
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();

  if (locale === "zh") {
    const cjkChars = (plainText.match(/[㐀-䶿一-鿿]/g) || []).length;
    const latinWords = plainText
      .replace(/[㐀-䶿一-鿿]/g, " ")
      .split(" ")
      .filter(Boolean).length;
    const minutes = Math.ceil(cjkChars / 300 + latinWords / wordsPerMinute);
    return minutes < 1 ? "< 1 分钟阅读" : `${minutes} 分钟阅读`;
  }

  const wordCount = plainText.split(" ").filter(Boolean).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  return minutes < 1 ? "< 1 min read" : `${minutes} min read`;
}
