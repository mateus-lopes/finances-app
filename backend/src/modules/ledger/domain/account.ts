export const ACCOUNT_TYPES = ["checking", "savings", "cash", "credit_card", "investment"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Tipos cujo saldo compõe o "dinheiro disponível". */
export const LIQUID_ACCOUNT_TYPES: readonly AccountType[] = ["checking", "savings", "cash"];

export interface Account {
  id: number;
  userId: number;
  name: string;
  type: AccountType;
  color: string | null;
  active: boolean;
  targetAmount: string | null;
  /** Saldo-base informado manualmente (usado apenas por contas de investimento). */
  currentAmount: string;
  showProgress: boolean;
  /** Conta bancária real — entra no "saldo real". Contas não-reais são envelopes. */
  isReal: boolean;
  createdAt: Date;
}

export interface AccountData {
  name: string;
  type: AccountType;
  color?: string;
  targetAmount?: number;
  currentAmount?: number;
  showProgress?: boolean;
  isReal?: boolean;
}
