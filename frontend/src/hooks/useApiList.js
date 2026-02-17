import { useEffect, useState } from "react";
import api from "../lib/api";

export const useApiList = (path, { storeId, params = {}, enabled = true } = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const query = { ...params };
    if (storeId) query.storeId = storeId;

    api
      .get(path, { params: query, signal: controller.signal })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setData(res.data);
          return;
        }
        if (Array.isArray(res.data?.items)) {
          setData(res.data.items);
          return;
        }
        setData([]);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err);
      })
      .finally(() => !controller.signal.aborted && setLoading(false));

    return () => controller.abort();
  }, [path, JSON.stringify(params), storeId, enabled]);

  return { data, loading, error };
};

export default useApiList;
