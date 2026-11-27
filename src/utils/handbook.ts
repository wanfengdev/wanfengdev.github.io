import { getCollection, type CollectionEntry } from "astro:content";
import meta from "@/data/handbook/meta.json";

export type HandbookEntry = CollectionEntry<"handbook">;
export type HandbookPart = (typeof meta)["parts"][number];

export const handbookMeta = meta;

export const getHandbookRoute = (id: string) => id.replace(/^zh\//, "");

export const getHandbookPath = (id: string) =>
  `/handbook/${getHandbookRoute(id)}`;

export async function getSortedChapters(): Promise<HandbookEntry[]> {
  const entries = await getCollection("handbook");
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export function getAdjacentChapters(
  entries: HandbookEntry[],
  current: HandbookEntry
) {
  const index = entries.findIndex(e => e.id === current.id);
  return {
    prev: index > 0 ? entries[index - 1] : undefined,
    next: index < entries.length - 1 ? entries[index + 1] : undefined,
  };
}

export function groupByPart(entries: HandbookEntry[]) {
  return meta.parts
    .map(part => ({
      part,
      entries: entries.filter(e => e.data.partId === part.id),
    }))
    .filter(group => group.entries.length > 0);
}

// Astro's glob loader strips "/index" from ids, so part guides have a
// single-segment route equal to their partId (e.g. "architecture").
export const isGuide = (entry: HandbookEntry) =>
  entry.data.chapter === undefined &&
  (getHandbookRoute(entry.id) === entry.data.partId ||
    getHandbookRoute(entry.id) === "preface");

export const isTopic = (entry: HandbookEntry) =>
  ["jev", "personal-agent", "fde"].includes(String(entry.data.chapter));

export type HandbookNode = {
  entry: HandbookEntry;
  children: HandbookNode[];
};

// Nest multi-article chapters/topics under their landing page.
// Only chapter landings (entries with a chapter field) act as parents;
// part guides never swallow their sibling chapters.
export function buildTree(entries: HandbookEntry[]): HandbookNode[] {
  const nodes: HandbookNode[] = entries.map(entry => ({ entry, children: [] }));
  const parents = new Map<string, HandbookNode>();
  for (const node of nodes) {
    if (node.entry.data.chapter === undefined) continue;
    const key = getHandbookRoute(node.entry.id).replace(/\/index$/, "");
    parents.set(key, node);
  }
  const roots: HandbookNode[] = [];
  for (const node of nodes) {
    const route = getHandbookRoute(node.entry.id);
    const parentKey = route.slice(0, route.lastIndexOf("/"));
    const parent = parents.get(parentKey);
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
