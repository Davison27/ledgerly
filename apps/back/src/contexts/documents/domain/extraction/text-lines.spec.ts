import { findLabelledValues, linesFromText } from './text-lines';
import { PdfTextLine } from './pdf-reader.port';

function parseNumber(cellText: string): number | undefined {
  const match = /-?\d+(?:[.,]\d+)?/.exec(cellText);
  return match ? Number(match[0].replace(',', '.')) : undefined;
}

describe('linesFromText', () => {
  it('splits each line into cells by tab, placing each cell 1000 units apart', () => {
    const lines = linesFromText('TOTAL\t100,00\nBASE\t80,00');

    expect(lines).toHaveLength(2);
    expect(lines[0].cells).toEqual([
      { x: 0, width: 0, text: 'TOTAL' },
      { x: 1000, width: 0, text: '100,00' },
    ]);
    expect(lines[1].cells).toEqual([
      { x: 0, width: 0, text: 'BASE' },
      { x: 1000, width: 0, text: '80,00' },
    ]);
  });

  it('drops blank lines and trims whitespace', () => {
    const lines = linesFromText('  TOTAL  \n\n   \n');

    expect(lines).toHaveLength(1);
    expect(lines[0].cells).toEqual([{ x: 0, width: 0, text: 'TOTAL' }]);
  });

  it('places every line on page 1', () => {
    const lines = linesFromText('A\nB');

    expect(lines.every((line) => line.page === 1)).toBe(true);
  });
});

describe('findLabelledValues', () => {
  it('finds a value inline within the label cell', () => {
    const lines = linesFromText('TOTAL: 100,00');

    const matches = findLabelledValues(lines, /total/i, parseNumber);

    expect(matches).toEqual([{ value: 100, lineIndex: 0, cellIndex: 0 }]);
  });

  it('finds a value in a cell to the right on the same line', () => {
    const lines = linesFromText('TOTAL\t100,00');

    const matches = findLabelledValues(lines, /total/i, parseNumber);

    expect(matches).toEqual([{ value: 100, lineIndex: 0, cellIndex: 0 }]);
  });

  it('finds a value in an overlapping cell on a line below, within the lookahead window', () => {
    const lines: PdfTextLine[] = [
      { page: 1, y: 100, height: 10, cells: [{ x: 50, width: 60, text: 'TOTAL' }] },
      { page: 1, y: 90, height: 10, cells: [{ x: 52, width: 40, text: '100,00' }] },
    ];

    const matches = findLabelledValues(lines, /total/i, parseNumber);

    expect(matches).toEqual([{ value: 100, lineIndex: 0, cellIndex: 0 }]);
  });

  it('ignores a value below when it is on a different page', () => {
    const lines: PdfTextLine[] = [
      { page: 1, y: 100, height: 10, cells: [{ x: 50, width: 60, text: 'TOTAL' }] },
      { page: 2, y: 90, height: 10, cells: [{ x: 52, width: 40, text: '100,00' }] },
    ];

    const matches = findLabelledValues(lines, /total/i, parseNumber);

    expect(matches).toEqual([]);
  });

  it('returns no match when the label cell has no nearby parseable value', () => {
    const lines = linesFromText('TOTAL\nunrelated text');

    const matches = findLabelledValues(lines, /total/i, parseNumber);

    expect(matches).toEqual([]);
  });

  it('returns no match when the label never appears', () => {
    const lines = linesFromText('BASE: 80,00');

    const matches = findLabelledValues(lines, /total/i, parseNumber);

    expect(matches).toEqual([]);
  });
});
