export interface MinimalPdfTextItem {
  x: number;
  y: number;
  text: string;
  size?: number;
}

export interface MinimalPdfPage {
  items: MinimalPdfTextItem[];
}

const PDF_HEADER = Buffer.from('%PDF-1.4\n', 'ascii');
const DEFAULT_FONT_SIZE = 10;
const FIRST_PAGE_OBJECT_NUMBER = 4;

interface PdfObject {
  num: number;
  body: Buffer;
}

function escapePdfText(text: string): string {
  return text.replace(/[\\()]/g, (match) => `\\${match}`);
}

function encodeWinAnsiChar(char: string): number {
  if (char === '€') {
    return 0x80;
  }
  const code = char.charCodeAt(0);
  if (code > 0xff) {
    throw new Error(`Unsupported character for WinAnsi encoding: ${char}`);
  }
  return code;
}

function encodeWinAnsiText(text: string): Buffer {
  const escaped = escapePdfText(text);
  return Buffer.from(Uint8Array.from([...escaped].map(encodeWinAnsiChar)));
}

function buildContentStream(page: MinimalPdfPage): Buffer {
  const parts: Buffer[] = [];
  for (const item of page.items) {
    const size = item.size ?? DEFAULT_FONT_SIZE;
    parts.push(Buffer.from(`BT /F1 ${size} Tf ${item.x} ${item.y} Td (`, 'ascii'));
    parts.push(encodeWinAnsiText(item.text));
    parts.push(Buffer.from(') Tj ET\n', 'ascii'));
  }
  return Buffer.concat(parts);
}

export function writeMinimalPdf(pages: MinimalPdfPage[]): Buffer {
  const pageObjectNumbers = pages.map((_, index) => FIRST_PAGE_OBJECT_NUMBER + index * 2);
  const contentObjectNumbers = pages.map((_, index) => FIRST_PAGE_OBJECT_NUMBER + index * 2 + 1);

  const objects: PdfObject[] = [
    { num: 1, body: Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n', 'ascii') },
    {
      num: 2,
      body: Buffer.from(
        `2 0 obj\n<< /Type /Pages /Kids [${pageObjectNumbers.map((num) => `${num} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`,
        'ascii',
      ),
    },
    {
      num: 3,
      body: Buffer.from(
        '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
        'ascii',
      ),
    },
  ];

  pages.forEach((page, index) => {
    const pageObjectNumber = pageObjectNumbers[index];
    const contentObjectNumber = contentObjectNumbers[index];

    objects.push({
      num: pageObjectNumber,
      body: Buffer.from(
        `${pageObjectNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>\nendobj\n`,
        'ascii',
      ),
    });

    const content = buildContentStream(page);
    objects.push({
      num: contentObjectNumber,
      body: Buffer.concat([
        Buffer.from(`${contentObjectNumber} 0 obj\n<< /Length ${content.length} >>\nstream\n`, 'ascii'),
        content,
        Buffer.from('\nendstream\nendobj\n', 'ascii'),
      ]),
    });
  });

  objects.sort((a, b) => a.num - b.num);

  const bodies: Buffer[] = [];
  const offsets: number[] = [];
  let offset = PDF_HEADER.length;
  for (const object of objects) {
    offsets.push(offset);
    bodies.push(object.body);
    offset += object.body.length;
  }

  const xrefOffset = offset;
  const totalEntries = objects.length + 1;
  const xrefLines = ['xref', `0 ${totalEntries}`, '0000000000 65535 f '];
  for (const objectOffset of offsets) {
    xrefLines.push(`${String(objectOffset).padStart(10, '0')} 00000 n `);
  }
  const xref = Buffer.from(`${xrefLines.join('\n')}\n`, 'ascii');
  const trailer = Buffer.from(
    `trailer\n<< /Size ${totalEntries} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    'ascii',
  );

  return Buffer.concat([PDF_HEADER, ...bodies, xref, trailer]);
}
