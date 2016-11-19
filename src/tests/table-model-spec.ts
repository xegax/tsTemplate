import {TableModelImpl, TableModelEvent, DimensionEnum} from 'model/table-model';

describe('table-model-spec.ts', () => {

  class TestModel extends TableModelImpl {
    buffCols: Array<number>;
    buffRows: Array<number>;

    constructor(cols: number, rows: number) {
      super();
      this.setTotal(cols, rows);
    }

    updateBuffs(cols: Array<number>, rows: Array<number>) {
      return new Promise(resolve => {
        this.buffCols = cols;
        this.buffRows = rows;
        resolve(null);
      });
    }

    getColDim() {
      return this.columns;
    }

    getRowsDim() {
      return this.rows;
    }
  }

  let rows = [];
  let cols = [];
  let rowsPerBuffer: number;
  let colsPerBuffer: number;
  let model: TestModel;
  let rowsTotal = 60000;
  let colsTotal = 5000;

  beforeAll(() => {
    model = new TestModel(5000, rowsTotal);
  });

  it('setTotal, getTotal', () => {
    let calls = 0;
    let callback = (mask: number) => {
      expect((mask & TableModelEvent.TOTAL) != 0).toBeTruthy();
      calls++;
    };
    expect(model.getTotal()).toEqual({rows: rowsTotal, columns: colsTotal});
    model.notifySubscribers();
  });

  it('loadData', () => {
    rows = [30, 115];
    rowsPerBuffer = rows[1] - rows[0] + 1;

    cols = [0, 49];
    colsPerBuffer = cols[1] - cols[0] + 1;
    model.loadData({rows, cols});

    expect(model.getRowsDim()).toEqual({
      range: rows,
      buffer: [0, 1], // [0 - 85][86 - 171]
      total: 60000,
      itemsPerBuffer: rowsPerBuffer
    });

    expect(model.getColDim()).toEqual({
      range: cols,
      buffer: [0, 0], // [0 - 49]
      total: 5000,
      itemsPerBuffer: colsPerBuffer
    });

    expect(model.buffRows).toEqual([0, 1]);
    expect(model.buffCols).toEqual([0, 0]);
  });

  it('getCellsRange', () => {
    expect(model.getCellsRange(DimensionEnum.Row, [0, 0])).toEqual([0, rowsPerBuffer - 1]);
    expect(model.getCellsRange(DimensionEnum.Row, [0, 1])).toEqual([0, rowsPerBuffer * 2 - 1]);
    expect(model.getCellsRange(DimensionEnum.Row, [0, 2])).toEqual([0, rowsPerBuffer * 3 - 1]);
    expect(model.getCellsRange(DimensionEnum.Row, [697, 697])).toEqual([697 * rowsPerBuffer, rowsTotal - 1]);
    expect(model.getCellsRange(DimensionEnum.Row, [697, 698])).toEqual([697 * rowsPerBuffer, rowsTotal - 1]);
    expect(model.getCellsRange(DimensionEnum.Row, [698, 698])).toEqual([rowsTotal - 1, rowsTotal - 1]);

    expect(model.getCellsRange(DimensionEnum.Column, [0, 0])).toEqual([0, colsPerBuffer - 1]);
    expect(model.getCellsRange(DimensionEnum.Column, [0, 1])).toEqual([0, colsPerBuffer * 2 - 1]);
    expect(model.getCellsRange(DimensionEnum.Column, [0, 2])).toEqual([0, colsPerBuffer * 3 - 1]);
    
    expect(model.getCellsRange(DimensionEnum.Column, [99, 99])).toEqual([99 * colsPerBuffer, colsTotal - 1]);

    expect(model.getCellsRange(DimensionEnum.Column, [99, 100])).toEqual([99 * colsPerBuffer, colsTotal - 1]);
    expect(model.getCellsRange(DimensionEnum.Column, [100, 100])).toEqual([colsTotal - 1, colsTotal - 1]);
  });
});