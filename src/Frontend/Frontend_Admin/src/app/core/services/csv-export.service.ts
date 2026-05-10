import { Injectable } from '@angular/core';

/**
 * CsvExportService — generisanje i preuzimanje CSV fajlova.
 *
 * Podrška:
 *  - RFC 4180 kvotiranje (vrednosti sa zarezom, navodnicima ili novim redom)
 *  - UTF-8 BOM na početku fajla (kompatibilnost sa Microsoft Excel)
 *  - CRLF separatori redova (standard za CSV)
 */
@Injectable({ providedIn: 'root' })
export class CsvExportService {

  /**
   * Preuzmi CSV fajl u pregledaču.
   *
   * @param filename  Ime fajla (sa .csv ekstenzijom)
   * @param headers   Nazivi kolona (prvi red)
   * @param rows      Redovi podataka — svaka vrednost se automatski kvotira
   */
  download(filename: string, headers: string[], rows: unknown[][]): void {
    const BOM = '﻿';
    const content = BOM + [
      headers.map(h => this.quote(h)).join(','),
      ...rows.map(row => row.map(cell => this.quote(cell)).join(',')),
    ].join('\r\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  /** Kvotira vrednost prema RFC 4180 ako sadrži specijalne karaktere. */
  private quote(value: unknown): string {
    const str = value == null ? '' : String(value);
    const needsQuotes = str.includes(',') || str.includes('"')
      || str.includes('\n') || str.includes('\r');
    return needsQuotes ? `"${str.replace(/"/g, '""')}"` : str;
  }
}
