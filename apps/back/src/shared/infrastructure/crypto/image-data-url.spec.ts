import { StoredFileCryptographyException } from '../../domain/errors/stored-file-cryptography.exception';
import { getStoredFilePlaintextLimit } from './stored-file-policy';
import { parseCanonicalImageDataUrl, serializeCanonicalImageDataUrl } from './image-data-url';

const pngBytes = Buffer.from('89504e470d0a1a0a00000000', 'hex');
const jpegBytes = Buffer.from('ffd8ffd9', 'hex');
const webpBytes = Buffer.from('524946460400000057454250', 'hex');

function dataUrl(mimeType: string, bytes: Buffer): string {
  return `data:${mimeType};base64,${bytes.toString('base64')}`;
}

describe('canonical image data URL', () => {
  it.each([
    ['image/png', pngBytes],
    ['image/jpeg', jpegBytes],
    ['image/webp', webpBytes],
  ])('parses and serializes canonical %s data URLs', (mimeType, bytes) => {
    const parsed = parseCanonicalImageDataUrl(dataUrl(mimeType, bytes), 'projectImage');

    expect(parsed).toEqual({ mimeType, bytes });
    expect(serializeCanonicalImageDataUrl(parsed.mimeType, parsed.bytes, 'projectImage')).toBe(dataUrl(mimeType, bytes));
  });

  it.each([
    'data:image/png;base64,',
    'data:image/png;base64,AA==\n',
    'data:image/png;base64,AA== ',
    'data:image/png;base64,AA=',
    'data:image/png;base64,AAAA=',
    'data:image/png;base64,AAAA\n',
    'data:image/png;charset=utf-8;base64,iVBORw0KGgoAAAAA',
    'data:image/svg+xml;base64,PHN2Zy8+',
    'data:image/gif;base64,R0lGODlh',
    'https://example.com/image.png',
  ])('rejects non-canonical data URLs', (value) => {
    expect(() => parseCanonicalImageDataUrl(value, 'companyLogo')).toThrow(StoredFileCryptographyException);
  });

  it.each([
    ['image/png', Buffer.from('ffd8ffd9', 'hex')],
    ['image/jpeg', pngBytes],
    ['image/webp', Buffer.from('52494646040000005745425000', 'hex')],
    ['image/webp', Buffer.from('52494646060000005745425000', 'hex')],
    ['image/jpeg', Buffer.from('ffd8ff', 'hex')],
  ])('rejects MIME and magic-byte mismatches', (mimeType, bytes) => {
    expect(() => parseCanonicalImageDataUrl(dataUrl(mimeType, bytes), 'productImage')).toThrow(StoredFileCryptographyException);
  });

  it('accepts the exact image limit and rejects one decoded byte over it before encryption', () => {
    const limit = getStoredFilePlaintextLimit('companyLogo');
    const exactLimitPng = Buffer.alloc(limit);
    pngBytes.copy(exactLimitPng);
    const oneOverPng = Buffer.alloc(limit + 1);
    pngBytes.copy(oneOverPng);

    expect(parseCanonicalImageDataUrl(dataUrl('image/png', exactLimitPng), 'companyLogo').bytes).toHaveLength(limit);
    expect(() => parseCanonicalImageDataUrl(dataUrl('image/png', oneOverPng), 'companyLogo')).toThrow(
      StoredFileCryptographyException,
    );
  });

  it('rejects one byte over and arbitrarily oversized encoded payloads before decoding', () => {
    const limit = getStoredFilePlaintextLimit('companyLogo');
    const exactLimitBase64Length = 4 * Math.ceil(limit / 3);
    const decode = jest.spyOn(Buffer, 'from');

    try {
      expect(() => parseCanonicalImageDataUrl(`data:image/png;base64,${'A'.repeat(exactLimitBase64Length)}`, 'companyLogo')).toThrow(
        StoredFileCryptographyException,
      );
      expect(() => parseCanonicalImageDataUrl(`data:image/png;base64,${'A'.repeat(exactLimitBase64Length + 4)}`, 'companyLogo')).toThrow(
        StoredFileCryptographyException,
      );
      expect(decode).not.toHaveBeenCalled();
    } finally {
      decode.mockRestore();
    }
  });
});
