import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';

function useCategories(enabled = true) {
  const [categories, setCategories] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    api
      .get('/categories')
      .then((res) => {
        if (!cancelled) setCategories(res.data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { categories, failed };
}

export default useCategories;