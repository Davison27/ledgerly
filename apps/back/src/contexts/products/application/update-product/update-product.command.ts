export interface UpdateProductCommand {
  id: string;
  name?: string;
  price: number | null;
}
