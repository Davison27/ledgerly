import { buildPageLines, PositionedTextItem } from './pdf-text-layout';

function item(overrides: Partial<PositionedTextItem>): PositionedTextItem {
  return { str: '', x: 0, y: 0, width: 0, height: 10, ...overrides };
}

describe('buildPageLines', () => {
  it('merges items separated by a small gap into a single concatenated cell', () => {
    const lines = buildPageLines(1, [
      item({ str: 'TOTAL', x: 0, y: 100, width: 40, height: 10 }),
      item({ str: ':', x: 40.5, y: 100, width: 4, height: 10 }),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0].cells).toHaveLength(1);
    expect(lines[0].cells[0].text).toBe('TOTAL:');
  });

  it('joins items separated by a moderate gap with a single space in the same cell', () => {
    const lines = buildPageLines(1, [
      item({ str: 'Factura', x: 0, y: 100, width: 40, height: 10 }),
      item({ str: 'FV-1', x: 48, y: 100, width: 20, height: 10 }),
    ]);

    expect(lines[0].cells).toHaveLength(1);
    expect(lines[0].cells[0].text).toBe('Factura FV-1');
  });

  it('starts a new cell when the gap is large, keeping columns apart', () => {
    const lines = buildPageLines(1, [
      item({ str: 'TOTAL A PAGAR', x: 50, y: 100, width: 70, height: 10 }),
      item({ str: '1.590,00', x: 200, y: 100, width: 40, height: 10 }),
    ]);

    expect(lines[0].cells).toHaveLength(2);
    expect(lines[0].cells[0].text).toBe('TOTAL A PAGAR');
    expect(lines[0].cells[1].text).toBe('1.590,00');
  });

  it('groups items into the same line despite a y jitter of up to 2 units', () => {
    const lines = buildPageLines(1, [
      item({ str: 'Left', x: 0, y: 100, width: 20, height: 10 }),
      item({ str: 'Right', x: 200, y: 98, width: 20, height: 10 }),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0].cells).toHaveLength(2);
  });

  it('starts a new line when the y difference exceeds the tolerance', () => {
    const lines = buildPageLines(1, [
      item({ str: 'First', x: 0, y: 100, width: 20, height: 10 }),
      item({ str: 'Second', x: 0, y: 80, width: 20, height: 10 }),
    ]);

    expect(lines).toHaveLength(2);
  });

  it('drops whitespace-only items so they act as gaps rather than cells', () => {
    const lines = buildPageLines(1, [
      item({ str: 'A', x: 0, y: 100, width: 10, height: 10 }),
      item({ str: '   ', x: 15, y: 100, width: 5, height: 10 }),
      item({ str: 'B', x: 200, y: 100, width: 10, height: 10 }),
    ]);

    expect(lines[0].cells).toHaveLength(2);
    expect(lines[0].cells[0].text).toBe('A');
    expect(lines[0].cells[1].text).toBe('B');
  });

  it('sorts items by y descending, then x, regardless of input order', () => {
    const lines = buildPageLines(1, [
      item({ str: 'Bottom', x: 0, y: 50, width: 20, height: 10 }),
      item({ str: 'Top', x: 0, y: 100, width: 20, height: 10 }),
    ]);

    expect(lines.map((line) => line.cells[0].text)).toEqual(['Top', 'Bottom']);
  });

  it('numbers lines with the given page across multiple pages', () => {
    const firstPage = buildPageLines(1, [item({ str: 'Página 1', x: 0, y: 100, width: 30, height: 10 })]);
    const secondPage = buildPageLines(2, [item({ str: 'Página 2', x: 0, y: 100, width: 30, height: 10 })]);

    expect(firstPage[0].page).toBe(1);
    expect(secondPage[0].page).toBe(2);
  });

  it('falls back to a height of 10 when the item height is below 1', () => {
    const lines = buildPageLines(1, [
      item({ str: 'Left', x: 0, y: 100, width: 20, height: 0 }),
      item({ str: 'Right', x: 200, y: 103, width: 20, height: 0 }),
    ]);

    expect(lines).toHaveLength(1);
  });
});
