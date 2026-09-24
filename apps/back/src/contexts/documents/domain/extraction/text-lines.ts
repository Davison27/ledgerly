import { PdfTextCell, PdfTextLine } from './pdf-reader.port';

const TEXT_LINE_CELL_COLUMN_WIDTH = 1000;
const TEXT_LINE_HEIGHT = 10;
const VALUE_BELOW_LOOKAHEAD_LINES = 2;
const HORIZONTAL_PROXIMITY_HEIGHT_MULTIPLIER = 2;

export function linesFromText(text: string): PdfTextLine[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, lineIndex) => {
      const cells: PdfTextCell[] = line.split('\t').map((cellText, cellIndex) => ({
        x: cellIndex * TEXT_LINE_CELL_COLUMN_WIDTH,
        width: 0,
        text: cellText.trim(),
      }));
      return { page: 1, y: -lineIndex, height: TEXT_LINE_HEIGHT, cells };
    });
}

export interface LabelledValueMatch<T> {
  value: T;
  lineIndex: number;
  cellIndex: number;
}

function cellsOverlapHorizontally(label: PdfTextCell, candidate: PdfTextCell, labelHeight: number): boolean {
  const withinProximity = Math.abs(candidate.x - label.x) <= labelHeight * HORIZONTAL_PROXIMITY_HEIGHT_MULTIPLIER;
  const labelEnd = label.x + label.width;
  const candidateEnd = candidate.x + candidate.width;
  const rangesOverlap = candidate.x <= labelEnd && candidateEnd >= label.x;
  return withinProximity || rangesOverlap;
}

function findValueToTheRight<T>(
  line: PdfTextLine,
  cellIndex: number,
  parse: (cellText: string) => T | undefined,
): T | undefined {
  for (let index = cellIndex + 1; index < line.cells.length; index++) {
    const value = parse(line.cells[index].text);
    if (value !== undefined) return value;
  }
  return undefined;
}

function findValueBelow<T>(
  lines: PdfTextLine[],
  lineIndex: number,
  labelCell: PdfTextCell,
  labelHeight: number,
  parse: (cellText: string) => T | undefined,
): T | undefined {
  const page = lines[lineIndex].page;
  for (
    let belowIndex = lineIndex + 1;
    belowIndex <= lineIndex + VALUE_BELOW_LOOKAHEAD_LINES && belowIndex < lines.length;
    belowIndex++
  ) {
    const belowLine = lines[belowIndex];
    if (belowLine.page !== page) break;
    for (const candidate of belowLine.cells) {
      if (!cellsOverlapHorizontally(labelCell, candidate, labelHeight)) continue;
      const value = parse(candidate.text);
      if (value !== undefined) return value;
    }
  }
  return undefined;
}

export function findLabelledValues<T>(
  lines: PdfTextLine[],
  label: RegExp,
  parse: (cellText: string) => T | undefined,
): LabelledValueMatch<T>[] {
  const results: LabelledValueMatch<T>[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    for (let cellIndex = 0; cellIndex < line.cells.length; cellIndex++) {
      const cell = line.cells[cellIndex];
      const match = label.exec(cell.text);
      if (!match) continue;

      const remainder = cell.text.slice(match.index + match[0].length);
      const inlineValue = parse(remainder);
      if (inlineValue !== undefined) {
        results.push({ value: inlineValue, lineIndex, cellIndex });
        continue;
      }

      const rightValue = findValueToTheRight(line, cellIndex, parse);
      if (rightValue !== undefined) {
        results.push({ value: rightValue, lineIndex, cellIndex });
        continue;
      }

      const belowValue = findValueBelow(lines, lineIndex, cell, line.height, parse);
      if (belowValue !== undefined) {
        results.push({ value: belowValue, lineIndex, cellIndex });
      }
    }
  }

  return results;
}
