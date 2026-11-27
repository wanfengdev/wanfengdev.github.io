import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getEntryPath } from "@/utils/contentEntry";
import getSortedPosts from "@/utils/getSortedPosts";
import { SITE } from "@/config";
import { useTranslations } from "@/i18n/utils";

export async function generateLocaleRss(locale: "zh" | "en") {
  const t = useTranslations(locale);
  const prefix = locale === "en" ? "/en" : "";
  const isMatchingLocale = (id: string) =>
    id.startsWith(`${locale}/`) || (locale === "zh" && !id.startsWith("en/"));

  const [blogPosts, galleryPosts] = await Promise.all([
    getCollection("blog", ({ id }) => isMatchingLocale(id)),
    SITE.showGalleries && SITE.showGalleriesInIndex
      ? getCollection("galleries", ({ id }) => isMatchingLocale(id))
      : Promise.resolve([]),
  ]);
  const sortedPosts = getSortedPosts([...blogPosts, ...galleryPosts]);
  return rss({
    title: SITE.title,
    description: t("index.heroDesc"),
    site: SITE.website,
    items: sortedPosts.map(entry => ({
      link: `${prefix}${getEntryPath(entry)}`,
      title: entry.data.title,
      description: entry.data.description,
      pubDate: new Date(
        "modDatetime" in entry.data && entry.data.modDatetime
          ? entry.data.modDatetime
          : entry.data.pubDatetime
      ),
    })),
  });
}

export const GET = () => generateLocaleRss("zh");
