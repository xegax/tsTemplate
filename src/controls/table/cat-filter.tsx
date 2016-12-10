import * as React from 'react';
import {Timer} from  'common/timer';
import {Filterable, CompoundCondition, ColumnCondition, ConditionCat} from 'model/filter-condition';
import {KeyCode} from 'common/keycode';
import {TableSourceModel} from 'model/table-source-model';
import {ComboBox} from 'controls/combobox';
import {ColumnsMap} from 'controls/table/table';
import {OrderedColumnsSourceModel} from 'model/ordered-columns-source-model';

interface Props {
  column?: string;
  source?: TableSourceModel;
  onClose?: () => void;
  condition?: ConditionCat;
  applyCondition?: (cond: CompoundCondition | ColumnCondition) => void;
}

interface State {
  source?: TableSourceModel;
  columnsMap?: ColumnsMap;
  cats?: {[name: string]: boolean};
}

export class CatFilter extends React.Component<Props, State> {
  private timer = new Timer(() => {
    if (!this.props.applyCondition)
      return;

    let catValues: Array<string> = Object.keys(this.state.cats)
      .filter(val => this.state.cats[val] === false);

    this.props.applyCondition({
      column: this.props.column,
      catValues,
      inverse: true
    });
  });

  constructor(props: Props) {
    super(props);
    this.state = {
      cats: {}
    };
    
    if (props.condition) {
      props.condition.catValues.forEach(value => this.state.cats[value] = false);
    }

    let source = props.source.getUniqueValues(props.source.getColumnIdx(props.column));
    this.state.source = new OrderedColumnsSourceModel(source, [
      { colIdx: 1}, { colIdx: 2 }
    ]);
    
    this.state.columnsMap = {
      name: {
        render: (s, raw, row) => {
          let checked = this.state.cats[s];
          if (checked == null)
            checked = true;
          return (
            <div>
              <input
                type='checkbox'
                checked={checked}
                onChange={e => this.onChange(s)}
              /> {s}
            </div>
          );
        }
      },
      count: {
        width: 0.4
      }
    };
  }

  componentDidMount() {
  }

  onSelect = (value, row) => {
    return false;
  }

  onChange = (name) => {
    let checked = this.state.cats[name] == null ? true : this.state.cats[name];
    this.state.cats[name] = !checked;
    this.timer.run(1000);
    this.forceUpdate();
  }

  render() {
    return (
      <ComboBox
        defaultFocus
        defaultPopup
        onSelect={this.onSelect}
        onBlur={this.props.onClose}
        columnsMap={this.state.columnsMap}
        sourceModel={this.state.source}
      />
    );
  }
}
