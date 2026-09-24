import { PdfTextCell, PdfTextLine } from '../../domain/extraction/pdf-reader.port';

export interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const SAME_LINE_Y_TOLERANCE_RATIO = 0.5;
const CONCATENATE_GAP_RATIO = 0.15;
const SPACE_GAP_RATIO = 1.5;
const MIN_ITEM_HEIGHT = 1;
const FALLBACK_ITEM_HEIGHT = 10;

function clampHeight(height: number): number {
  return height >= MIN_ITEM_HEIGHT ? height : FALLBACK_ITEM_HEIGHT;
}

interface LineAccumulator {
  y: number;
  height: number;
  items: PositionedTextItem[];
}

export function buildPageLines(page: number, items: PositionedTextItem[]): PdfTextLine[] {
  const nonEmptyItems = items.filter((item) => item.str.trim().length > 0);
  const sortedItems = [...nonEmptyItems].sort((a, b) => b.y - a.y || a.x - b.x);

  const lineAccumulators: LineAccumulator[] = [];
  for (const item of sortedItems) {
    const lastLine = lineAccumulators[lineAccumulators.length - 1];
    const itemHeight = clampHeight(item.height);
    if (lastLine && Math.abs(item.y - lastLine.y) <= SAME_LINE_Y_TOLERANCE_RATIO * Math.min(itemHeight, lastLine.height)) {
      lastLine.items.push(item);
      continue;
    }
    lineAccumulators.push({ y: item.y, height: itemHeight, items: [item] });
  }

  return lineAccumulators.map((line) => buildLine(page, line));
}

function buildLine(page: number, line: LineAccumulator): PdfTextLine {
  const sortedItems = [...line.items].sort((a, b) => a.x - b.x);
  const cells: PdfTextCell[] = [];

  let cellX = sortedItems[0].x;
  let cellEnd = sortedItems[0].x + sortedItems[0].width;
  let cellText = sortedItems[0].str;
  let previousItem = sortedItems[0];

  for (let index = 1; index < sortedItems.length; index += 1) {
    const item = sortedItems[index];
    const height = Math.min(clampHeight(previousItem.height), clampHeight(item.height));
    const gap = item.x - (previousItem.x + previousItem.width);

    if (gap <= CONCATENATE_GAP_RATIO * height) {
      cellText += item.str;
      cellEnd = item.x + item.width;
    } else if (gap <= SPACE_GAP_RATIO * height) {
      cellText += ` ${item.str}`;
      cellEnd = item.x + item.width;
    } else {
      cells.push({ x: cellX, width: cellEnd - cellX, text: cellText });
      cellX = item.x;
      cellEnd = item.x + item.width;
      cellText = item.str;
    }

    previousItem = item;
  }
  cells.push({ x: cellX, width: cellEnd - cellX, text: cellText });

  return { page, y: line.y, height: line.height, cells };
}
