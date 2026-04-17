export class CSVLoader {
  static parseCSV(text: string): any[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        let val: any = values[index];
        // 숫자 변환 시도
        if (val !== undefined && !isNaN(Number(val)) && val !== '') {
          val = Number(val);
        }
        obj[header] = val;
      });
      return obj;
    });
  }

  static async load(path: string): Promise<any[]> {
    const response = await fetch(path);
    const text = await response.text();
    return this.parseCSV(text);
  }
}
