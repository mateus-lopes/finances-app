/** Fonte de "agora" injetável — permite testar regras dependentes de data. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
