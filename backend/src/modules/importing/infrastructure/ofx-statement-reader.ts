import type { StatementEntry } from "../domain/statement-entry";
import type { StatementReader } from "../application/ports";

function extractTag(block: string, name: string): string {
  const m = new RegExp(`<${name}>([^<\\r\\n]+)`, "i").exec(block);
  return m ? m[1].trim() : "";
}

function parseOfxDate(raw: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(raw);
  if (!m) return null;
  const year = parseInt(m[1]!);
  if (year < 2000 || year > 2100) return null; // rejeita datas inválidas do BB
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Leitor de OFX (SGML) tolerante: extrai apenas os blocos <STMTTRN> válidos. */
export class OfxStatementReader implements StatementReader {
  read(content: string): StatementEntry[] {
    const entries: StatementEntry[] = [];
    const blockRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let m: RegExpExecArray | null;

    while ((m = blockRe.exec(content)) !== null) {
      const block = m[1];
      const memo = extractTag(block, "MEMO") || extractTag(block, "NAME");
      const amount = parseFloat(extractTag(block, "TRNAMT").replace(",", "."));
      const date = parseOfxDate(extractTag(block, "DTPOSTED"));
      if (isNaN(amount) || !memo || !date) continue;

      entries.push({ fitid: extractTag(block, "FITID"), date, amount, memo });
    }

    return entries;
  }
}
