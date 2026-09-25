// Tính trục cho biểu đồ: làm tròn về số "đẹp" (1, 2, 2.5, 5 × 10^n)

function niceStep(rough: number) {
  if (rough <= 0) return 1;
  const exponent = Math.floor(Math.log10(rough));
  const base = 10 ** exponent;
  const fraction = rough / base;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * base;
}

export interface Axis {
  min: number;
  max: number;
  ticks: number[];
}

// `includeZero` cho biểu đồ cột (cột luôn mọc từ 0), biểu đồ đường thì bám sát dữ liệu
export function niceAxis(values: number[], { includeZero = false, tickCount = 3 } = {}): Axis {
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (includeZero) lo = Math.min(0, lo);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1, ticks: [0, 1] };
  if (lo === hi) {
    const pad = lo === 0 ? 1 : Math.abs(lo) * 0.05;
    lo -= includeZero && lo === 0 ? 0 : pad;
    hi += pad;
  }

  const step = niceStep((hi - lo) / (tickCount - 1));
  const min = includeZero ? Math.min(0, Math.floor(lo / step) * step) : Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;

  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return { min, max, ticks };
}

export function formatTick(value: number) {
  if (Math.abs(value) >= 10000) return `${Math.round(value / 1000).toLocaleString("vi-VN")}k`;
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
}

// "2026-09-25" → "25/9"
export function shortDate(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${d}/${m}`;
}
