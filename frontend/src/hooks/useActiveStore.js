import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { getStoredStoreId, setStoredStoreId } from "../lib/session";

const envStoreId = process.env.REACT_APP_STORE_ID || "";

export const useActiveStore = () => {
  const [storeId, setStoreIdState] = useState(envStoreId || getStoredStoreId());
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);

  const setStoreId = (value) => {
    if (!value) return;
    setStoreIdState(value);
    setStoredStoreId(value);
    api.defaults.headers.common["X-Store-Id"] = value;
  };

  useEffect(() => {
    if (storeId) {
      api.defaults.headers.common["X-Store-Id"] = storeId;
    }
  }, [storeId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingStores(true);

    const load = async () => {
      try {
        const [storesRes, accessRes] = await Promise.all([
          api.get("/stores"),
          api.get("/auth/access").catch(() => ({ data: {} })),
        ]);
        if (cancelled) return;
        const rows = Array.isArray(storesRes.data) ? storesRes.data : [];
        setStores(rows);
        const accessStoreId = accessRes?.data?.currentStoreId || "";
        if (!storeId || !rows.some((r) => r.id === storeId)) {
          if (accessStoreId && rows.some((r) => r.id === accessStoreId)) {
            setStoreId(accessStoreId);
          } else if (rows[0]?.id) {
            setStoreId(rows[0].id);
          }
        }
      } catch {
        if (!cancelled) {
          setStores([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingStores(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  return useMemo(
    () => ({ storeId, stores, loadingStores, setStoreId }),
    [storeId, stores, loadingStores]
  );
};

export default useActiveStore;
