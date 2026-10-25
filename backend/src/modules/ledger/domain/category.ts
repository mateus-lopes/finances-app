export interface Category {
  id: number;
  userId: number;
  name: string;
  color: string | null;
  createdAt: Date;
}

export interface CategoryData {
  name: string;
  color?: string;
}
