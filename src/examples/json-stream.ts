import * as fs from 'fs';

interface ColumnStat {
  types: Array<string>;
  minMaxSize: Array<number>;
}

export class JSONStreamWriter {
  private rowsPerFile: number = 300;
  private rowsTotal: number = 0;
  private columns = Array<string>();
  private types = Array<string>();
  private file: string;
  private buff = Array<any>();
  private buffIdx: number = 0;
  private statOfColumn = Array<ColumnStat>();

  constructor(file: string, columns: Array<string>) {
    this.columns = columns.slice();
    this.statOfColumn = columns.map(name => ({
      types: [],
      minMaxSize: []
    }));
    this.file = file;
  }

  writeRow(data: Array<any>) {
    if (data.length != this.columns.length)
      throw `row columns not equal to predefined columns, row=${this.rowsTotal}`;
    
    if (this.file == null)
      throw 'stream already closed';

    this.rowsTotal++;
    this.buff.push(data);
    data.forEach((value, idx) => {
      if (value == null || value != value)
        value = '';
      const type = typeof value;
      const currValue = type == 'string' ? value.length : value;
      const stat = this.statOfColumn[idx];
      if (!stat.minMaxSize.length) {
        stat.minMaxSize = [currValue, currValue];
      } else {
        stat.minMaxSize[0] = Math.min(stat.minMaxSize[0], currValue);
        stat.minMaxSize[1] = Math.max(stat.minMaxSize[1], currValue);
      }
      if (stat.types.indexOf(type) == -1)
        stat.types.push(type);
    });
    if (this.buff.length >= this.rowsPerFile) {
      this.flushBuff();
    }
  }

  close() {
    if (this.file == null)
      throw 'stream already closed';

    this.writeHeader();
    this.file = null;
  }

  private getBuffFile() {
    return `${this.file}-${this.buffIdx}.json`;
  }

  private flushBuff() {
    fs.writeFileSync(this.getBuffFile(), JSON.stringify(this.buff));
    this.buffIdx++;
    this.buff = [];
  }

  private writeHeader() {
    const header = {
      rows: this.rowsTotal,
      rowsPerBuffer: this.rowsPerFile,
      columns: this.columns,
      stat: this.statOfColumn
    };
    fs.writeFileSync(this.file, JSON.stringify(header, null, 2));
  }
}