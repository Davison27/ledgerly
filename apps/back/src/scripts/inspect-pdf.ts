import { readFileSync } from 'node:fs';
import { PdfjsPdfReader } from '../contexts/documents/infrastructure/pdf/pdfjs-pdf-reader';
import { extractInvoiceHeuristics } from '../contexts/documents/domain/extraction/invoice-heuristics';
import { parseFacturae } from '../contexts/documents/domain/extraction/facturae-parser';
import { parseFacturx } from '../contexts/documents/domain/extraction/facturx-parser';

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) {
    console.error('Falta la ruta del PDF. Uso: ts-node src/scripts/inspect-pdf.ts <ruta.pdf>');
    process.exit(1);
  }

  const buffer = readFileSync(path);
  const reader = new PdfjsPdfReader();
  const { text, attachments } = await reader.read(buffer);

  console.log('==================================================================');
  console.log(`PDF: ${path}`);
  console.log(`Adjuntos: ${attachments.length}`);
  for (const att of attachments) {
    const head = att.content.subarray(0, 60).toString('utf-8').replace(/\s+/g, ' ');
    console.log(`  - ${att.filename} (${att.content.length} bytes) -> ${head}`);
  }

  console.log('\n----------------------- TEXTO EXTRAÍDO ---------------------------');
  if (text.trim().length === 0) {
    console.log('(vacío — el PDF no tiene capa de texto: es un escaneo/imagen)');
  } else {
    text.split('\n').forEach((line, i) => {
      console.log(`${String(i + 1).padStart(3, ' ')} | ${line}`);
    });
  }

  console.log('\n------------------- CAMPOS DETECTADOS (XML) ----------------------');
  let structured = false;
  for (const att of attachments) {
    const xml = att.content.toString('utf-8');
    const fe = parseFacturae(xml);
    const fx = parseFacturx(xml);
    if (fe) {
      structured = true;
      console.log('Facturae:', JSON.stringify(fe, null, 2));
    } else if (fx) {
      structured = true;
      console.log('Factur-X:', JSON.stringify(fx, null, 2));
    }
  }
  if (!structured) console.log('(sin XML estructurado válido)');

  console.log('\n---------------- CAMPOS DETECTADOS (HEURÍSTICA) ------------------');
  const { fields, warnings } = extractInvoiceHeuristics(text);
  console.log(JSON.stringify(fields, null, 2));
  if (warnings.length > 0) console.log('warnings:', warnings);
  console.log('==================================================================');
}

void main();
