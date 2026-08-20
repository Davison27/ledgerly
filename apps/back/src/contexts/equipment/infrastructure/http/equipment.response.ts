import { Equipment } from '../../domain/equipment';

export class EquipmentResponse {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  reference: string | null;
  category: string | null;
  brand: string | null;
  description: string | null;
  image: string | null;
  tags: string[];
  leasingMonthlyFee: number | null;

  static fromDomain(equipment: Equipment): EquipmentResponse {
    const response = new EquipmentResponse();
    const primitives = equipment.toPrimitives();

    response.id = primitives.id;
    response.name = primitives.name;
    response.price = primitives.price;
    response.stock = primitives.stock;
    response.reference = primitives.reference ?? null;
    response.category = primitives.category ?? null;
    response.brand = primitives.brand ?? null;
    response.description = primitives.description ?? null;
    response.image = primitives.image ?? null;
    response.tags = primitives.tags ?? [];
    response.leasingMonthlyFee = primitives.leasingMonthlyFee ?? null;

    return response;
  }
}
