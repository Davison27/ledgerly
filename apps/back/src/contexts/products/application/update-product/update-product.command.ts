export interface UpdateProductCommand {
  id: string;
  name?: string;
  price?: number | null;
  stock?: number;
  reference?: string | null;
  category?: string | null;
  brand?: string | null;
  description?: string | null;
  image?: string | null;
  tags?: string[];
}
