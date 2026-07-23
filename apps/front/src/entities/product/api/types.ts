export interface ProductDto {
  id: string;
  name: string;
  price: number | null;
  stock: number;
}

export interface CreateProductPayload {
  name: string;
  price?: number;
  stock?: number;
}

export interface UpdateProductPayload {
  name?: string;
  price?: number;
  stock?: number;
}
