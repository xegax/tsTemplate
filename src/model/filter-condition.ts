export type Operator = 'and' | 'or';

enum CmpOperator {
  equals,
  less,
  greater,
  eless,
  egreater
};

export interface ConditionNum {
  column: string;
  cmpOp?: CmpOperator;
  colIdx?: number;
  numValue: number;
  inverse?: boolean;
}

export interface ConditionCat {
  column: string;
  colIdx?: number;
  catValues: Array<string>;
  inverse?: boolean;
}

export interface ConditionText {
  column: string;
  colIdx?: number;
  textValue: string;
  regexp?: boolean;
  caseSensitive?: boolean;
  inverse?: boolean;
}

export type ColumnCondition = ConditionNum | ConditionCat | ConditionText;

export interface CompoundCondition {
  inverse?: boolean;
  op: Operator;
  condition: Array<CompoundCondition | ColumnCondition>;
}

export type FilterFunction = (values: {[colIdx: number]: string | number}) => boolean;

function inverse(res: boolean, inverse: boolean) {
  return inverse ? !res : res;
}

function simpleCmpFunc(value: string | number, cond: ColumnCondition) {
  let textCond = cond as ConditionText;
  if (textCond.textValue != null) {
    value = '' + value;
    let tgt = textCond.textValue;
    if (!textCond.caseSensitive) {
      tgt = tgt.toLowerCase();
      value = value.toLowerCase();
    }
    return value.indexOf(tgt) != -1;
  }

  let numCond = cond as ConditionNum;
  if ('numValue' in numCond) {
    value = +value;
    if (numCond.cmpOp == CmpOperator.equals)
      return numCond.numValue == value;
    if (numCond.cmpOp == CmpOperator.less)
      return numCond.numValue < value;
    if (numCond.cmpOp == CmpOperator.eless)
      return numCond.numValue <= value;
    if (numCond.cmpOp == CmpOperator.greater)
      return numCond.numValue > value;
    if (numCond.cmpOp == CmpOperator.egreater)
      return numCond.numValue >= value;
  }

  let catCond = cond as ConditionCat;
  if (catCond.catValues != null) {
    return catCond.catValues.indexOf('' + value) != -1;
  }

  return true;
}

export function makeFilterFunction(cond: CompoundCondition | ColumnCondition): FilterFunction {
  let compCond = cond as CompoundCondition;
  let func = (values) => {
    let ok;
    if (compCond.op != null) {
      for (let n = 0; n < compCond.condition.length; n++) {
        let colCond = compCond.condition[n] as ColumnCondition;
        let res = inverse(simpleCmpFunc(values[colCond.colIdx], colCond), colCond.inverse);
        if (compCond.op == 'or' && res)
          return inverse(true, compCond.inverse);
        else if (compCond.op == 'and' && res == false)
          return inverse(false, compCond.inverse);
      }

      ok = compCond.op == 'and';
    } else {
      let colCond = cond as ColumnCondition;
      ok = simpleCmpFunc(values[colCond.colIdx], colCond);
    }

    return inverse(ok, cond.inverse);
  };

  return func;
}