export interface ProductDto {
  id: string;
  name: string;
  price: number | null;
}

export interface CreateProductPayload {
  name: string;
  price?: number;
}

export interface UpdateProductPayload {
  name?: string;
  price?: number;
}
