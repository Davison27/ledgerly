/**
 * The document type catalogue is data, not an enum (D1 of the staff-section
 * plan): the domain does not know any of the seed codes (`dni`, `foto`,
 * `prl`, `art19`, `epis`, `renuncia_reco`, `reta_recibo`, `varios`), only
 * this shape. Managing the catalogue is out of scope for this feature; it is
 * read-only here, seeded by `1737000000000-CreateStaff.ts`.
 */
export interface StaffDocumentType {
  id: string;
  code: string;
  name: string;
  expires: boolean;
  defaultValidityMonths: number | null;
  isSystem: boolean;
}
