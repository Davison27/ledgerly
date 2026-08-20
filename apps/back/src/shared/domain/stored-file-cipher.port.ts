export const STORED_FILE_CIPHER = Symbol('StoredFileCipher');

export type StoredFileStore =
  | 'document'
  | 'staffDocument'
  | 'companyDocument'
  | 'companyLogo'
  | 'projectImage'
  | 'equipmentImage'
  | 'equipmentDocument';

export interface StoredFileAadDescriptor {
  store: StoredFileStore;
  rowId: string;
  mimeType: string | null;
  plaintextSize: number;
}

export interface StoredFileEnvelope {
  version: string;
  nonce: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
}

export interface StoredFileCipher {
  encrypt(plaintext: Buffer, descriptor: StoredFileAadDescriptor): StoredFileEnvelope;
  decrypt(envelope: StoredFileEnvelope, descriptor: StoredFileAadDescriptor): Buffer;
}
