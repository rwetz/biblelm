import { useEffect, useState } from "react";
import { listTranslations, loadIndex, loadTranslation, type Translation, type TranslationMeta, type VerseIndex } from "./bible";
import { loadGraph, type Graph } from "./xrefs";
import { loadTopics, type Topic } from "./topics";

/** Resolve a promise-returning loader into [value, error]. */
function useLoad<T>(load: () => Promise<T>, deps: unknown[]): [T | null, string | null] {
  const [state, setState] = useState<[T | null, string | null]>([null, null]);
  useEffect(() => {
    let live = true;
    setState(([v]) => [v, null]);
    load().then(
      (v) => live && setState([v, null]),
      (e) => live && setState([null, String(e?.message ?? e)]),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export const useTranslation = (id: string) => useLoad<Translation>(() => loadTranslation(id), [id]);
export const useTranslations = (ids: string[]) =>
  useLoad<Translation[]>(() => Promise.all(ids.map(loadTranslation)), [ids.join(",")]);
export const useCatalog = () => useLoad<TranslationMeta[]>(listTranslations, []);
export const useIndex = () => useLoad<VerseIndex>(loadIndex, []);
export const useGraph = () => useLoad<Graph>(loadGraph, []);
export const useTopics = () => useLoad<Topic[]>(loadTopics, []);
