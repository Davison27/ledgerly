export interface UpdateProductCommand {
  id: string;
  name?: string;
  price: number | null;
  stock?: number;
}
