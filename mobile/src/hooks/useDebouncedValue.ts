import { useEffect, useState } from "react";

// Trả về `value` sau khi người dùng ngừng gõ `delay` ms, tránh gọi API mỗi phím
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
