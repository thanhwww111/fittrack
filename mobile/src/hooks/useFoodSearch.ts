import { useCallback, useEffect, useState } from "react";
import { foodApi } from "@/api/foodApi";
import { errorMessage } from "@/lib/formErrors";
import type { Food } from "@/types/models";
import { useDebouncedValue } from "./useDebouncedValue";

const PAGE_SIZE = 20;

interface Results {
  // Từ khoá mà `items` đang ứng với; khác từ khoá hiện tại nghĩa là trang 1 đang tải
  search: string | null;
  items: Food[];
  page: number;
  total: number;
}

export function useFoodSearch(query: string) {
  const search = useDebouncedValue(query.trim());

  const [results, setResults] = useState<Results>({ search: null, items: [], page: 0, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tăng lên để tải lại trang 1 với cùng từ khoá (vừa sửa / xoá món)
  const [version, setVersion] = useState(0);

  // Tải trang 1 mỗi khi từ khoá đổi. setState chỉ gọi trong callback bất đồng bộ,
  // và bỏ qua kết quả của request cũ nếu người dùng đã gõ từ khoá khác.
  useEffect(() => {
    let cancelled = false;
    foodApi
      .search({ search: search || undefined, page: 1, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setResults({ search, items: res.items, page: 1, total: res.total });
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setResults({ search, items: [], page: 0, total: 0 });
        setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [search, version]);

  const isLoading = results.search !== search || loadingMore;

  const loadMore = useCallback(async () => {
    if (isLoading || results.items.length >= results.total) return;
    setLoadingMore(true);
    try {
      const res = await foodApi.search({
        search: search || undefined,
        page: results.page + 1,
        limit: PAGE_SIZE,
      });
      setResults((prev) =>
        prev.search === search
          ? { ...prev, items: [...prev.items, ...res.items], page: res.page, total: res.total }
          : prev
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [isLoading, results, search]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { items: results.items, total: results.total, isLoading, error, loadMore, refresh };
}
