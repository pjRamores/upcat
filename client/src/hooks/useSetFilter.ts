import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi, type AdminQuestionSet } from "@/lib/adminApi";
import { useToastStore } from "@/stores/toastStore";
import { useAdminSetStore } from "@/stores/adminSetStore";

/**
 * Loads the list of active question sets and exposes a required single-select.
 * The selected set ID is persisted in a shared Zustand store so it carries over
 * between admin pages (Questions, Workflow, Import/Export, Media Library, Passages).
 */
export function useSetFilter() {
  const [searchParams] = useSearchParams();
  const addToast = useToastStore((s) => s.addToast);
  const selectedSetId = useAdminSetStore((s) => s.selectedSetId);
  const setSelectedSetId = useAdminSetStore((s) => s.setSelectedSetId);
  const [setOptions, setSetOptions] = useState<AdminQuestionSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);

  const requestedSetId = (searchParams.get("setId") ?? "").trim();

  const loadSetOptions = useCallback(async () => {
    setSetsLoading(true);

    try {
      const result = await adminApi.getQuestionSets({ page: 1, limit: 200 });

      const sets: AdminQuestionSet[] = result.items
        .filter((s) => s.isActive !== false)
        .map((s) => ({
          ...s,
          id: String(s.id),
        }));

      const ids = new Set(sets.map((s) => s.id).filter(Boolean));

      setSetOptions(sets);

      // Priority: explicit URL setId > existing shared selection > first active set.
      const nextSelectedSetId =
        requestedSetId && ids.has(requestedSetId)
          ? requestedSetId
          : selectedSetId && ids.has(selectedSetId)
            ? selectedSetId
            : sets?.id ?? "";

      setSelectedSetId(nextSelectedSetId);
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Could not load question sets.");
    } finally {
      setSetsLoading(false);
    }
  }, [addToast, requestedSetId, selectedSetId, setSelectedSetId]);

  useEffect(() => {
    void loadSetOptions();
  }, [loadSetOptions]);

  return {
    setOptions,
    selectedSetId,
    setSelectedSetId,
    setsLoading,
    loadSetOptions,
  };
}
