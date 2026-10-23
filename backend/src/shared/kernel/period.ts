/** Competência mensal (mês 1–12 + ano). Base de quase todas as consultas do app. */
export interface Period {
  month: number;
  year: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Extrai a competência de uma data ISO `YYYY-MM-DD`. */
export function periodOfIsoDate(date: string): Period {
  const [year, month] = date.split("-").map(Number);
  return { month, year };
}

export function periodOfDate(date: Date): Period {
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export function shiftPeriod({ month, year }: Period, steps: number): Period {
  let m = month + steps;
  let y = year;
  while (m <= 0) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return { month: m, year: y };
}

/** `count` competências consecutivas terminando em `end`, em ordem cronológica. */
export function trailingPeriods(end: Period, count: number): Period[] {
  return Array.from({ length: count }, (_, i) => shiftPeriod(end, -(count - 1 - i)));
}

export function firstDayOf({ month, year }: Period): string {
  return `${year}-${pad2(month)}-01`;
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}
