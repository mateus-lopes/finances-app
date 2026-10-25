export type UserId = number;

/** Referência leve a uma entidade para exibição (nome/cor), usada em listagens enriquecidas. */
export interface AccountRef {
  id: number;
  name: string;
  type: string;
  color: string | null;
}

export interface CategoryRef {
  id: number;
  name: string;
  color: string | null;
}
