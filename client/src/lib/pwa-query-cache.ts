import type { Query, QueryClient } from "@tanstack/react-query";
import { loadStoredQueries, saveStoredQueries, type StoredQuery } from "./pwa-storage";

const MAX_PERSISTED_QUERIES = 40;
const MAX_CACHE_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const CACHEABLE_PREFIXES = ["/api/projects", "/api/mandats", "/api/offres", "/api/heat-pumps"];

function isCacheableQuery(query: Query) {
  const [resource] = query.queryKey;
  return typeof resource === "string" && CACHEABLE_PREFIXES.some((prefix) => resource.startsWith(prefix));
}

export async function hydratePwaQueryCache(queryClient: QueryClient, ownerId: string) {
  const oldestAllowed = Date.now() - MAX_CACHE_AGE_MS;
  const records = await loadStoredQueries(ownerId);

  records
    .filter((record) => record.updatedAt >= oldestAllowed)
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .forEach((record) => {
      queryClient.setQueryData(record.queryKey, record.data, { updatedAt: record.updatedAt });
    });
}

async function persistQueryCache(queryClient: QueryClient, ownerId: string) {
  const records: StoredQuery[] = queryClient
    .getQueryCache()
    .getAll()
    .filter(isCacheableQuery)
    .filter((query) => query.state.data !== undefined && query.state.dataUpdatedAt > 0)
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
    .slice(0, MAX_PERSISTED_QUERIES)
    .map((query) => ({
      key: `${ownerId}:${query.queryHash}`,
      ownerId,
      queryKey: [...query.queryKey],
      data: query.state.data,
      updatedAt: query.state.dataUpdatedAt,
    }));

  await saveStoredQueries(records, ownerId);
}

export function startPwaQueryPersistence(queryClient: QueryClient, ownerId: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedulePersist = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void persistQueryCache(queryClient, ownerId);
    }, 250);
  };

  schedulePersist();
  const unsubscribe = queryClient.getQueryCache().subscribe(schedulePersist);

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}