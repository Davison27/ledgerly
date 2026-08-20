import { DataSource } from 'typeorm';
import { createStoredFileCipher } from '../../../../shared/infrastructure/crypto/stored-file-cipher';
import { encryptStoredImage } from '../../../../shared/infrastructure/crypto/stored-image-envelope';
import { TypeOrmScheduleProjectReader } from './typeorm-schedule-project-reader';
import { StoredFileCryptographyException } from '../../../../shared/domain/errors/stored-file-cryptography.exception';

const image = `data:image/png;base64,${Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64')}`;

function createCipher() {
  return createStoredFileCipher({
    activeVersion: 'v1',
    keys: new Map([['v1', Buffer.alloc(32, 1)]]),
  });
}

function encryptedProjectRow() {
  const envelope = encryptStoredImage(image, 'projectImage', 'project-1', createCipher()).envelope;
  return {
    id: 'project-1',
    name: 'Project',
    code: 'PROJECT-001',
    imageCiphertext: envelope.ciphertext,
    imageNonce: envelope.nonce,
    imageTag: envelope.tag,
    imageKeyVersion: envelope.keyVersion,
    imageMimeType: envelope.mimeType,
    imageSize: envelope.size,
    status: 'active',
    color: null,
    startDate: null,
    endDate: null,
    hasEvents: false,
  };
}

describe('TypeOrmScheduleProjectReader', () => {
  it('hydrates canonical images from complete encrypted fields for both raw reader paths', async () => {
    const query = jest.fn().mockResolvedValue([encryptedProjectRow()]);
    const reader = new TypeOrmScheduleProjectReader({ query } as unknown as DataSource, createCipher());

    await expect(reader.findActive()).resolves.toEqual([expect.objectContaining({ id: 'project-1', image })]);
    await expect(reader.findByIds(['project-1'])).resolves.toEqual([expect.objectContaining({ id: 'project-1', image })]);
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('p.image_ciphertext AS "imageCiphertext"'), [501]);
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('image_ciphertext AS "imageCiphertext"'), [['project-1']]);
  });

  it('fails closed when either raw reader receives a partial envelope', async () => {
    const row = encryptedProjectRow();
    row.imageTag = null;
    const query = jest.fn().mockResolvedValue([row]);
    const reader = new TypeOrmScheduleProjectReader({ query } as unknown as DataSource, createCipher());

    await expect(reader.findActive()).rejects.toThrow(StoredFileCryptographyException);
    await expect(reader.findByIds(['project-1'])).rejects.toThrow(StoredFileCryptographyException);
  });

  it('does not query when no project IDs are requested', async () => {
    const query = jest.fn();
    const reader = new TypeOrmScheduleProjectReader({ query } as unknown as DataSource, createCipher());

    await expect(reader.findByIds([])).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
