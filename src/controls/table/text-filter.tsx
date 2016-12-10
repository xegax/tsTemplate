import * as React from 'react';
import {Timer} from  'common/timer';
import {Filterable, ConditionText, CompoundCondition, ColumnCondition} from 'model/filter-condition';
import {KeyCode} from 'common/keycode';

interface Props {
  column?: string;
  source?: Filterable;
  onClose?: () => void;
  applyCondition?: (cond: CompoundCondition | ColumnCondition) => void;
  condition?: ConditionText;
}

interface State {
  text?: string;
}

export class TextFilter extends React.Component<Props, State> {
  private text: HTMLInputElement;
  private timer = new Timer(() => {
    if (!this.props.applyCondition)
      return; 

    this.props.applyCondition({
      column: this.props.column,
      textValue: this.text.value
    });
  });

  constructor(props: Props) {
    super(props);
    this.state = {};
    let cond = props.condition as ConditionText;
    if (cond) {
      this.state.text = cond.textValue;
    }
  }

  componentDidMount() {
    this.text.focus();
  }

  onKeyDown = (event: React.KeyboardEvent) => {
    if (event.keyCode == KeyCode.Escape)
      this.props.onClose && this.props.onClose();
  }

  onChange = () => {
    this.timer.run(1000);
  }

  render() {
    return (
      <input
        defaultValue={this.state.text}
        onChange={this.onChange}
        onKeyDown={this.onKeyDown}
        onBlur={e => this.props.onClose && this.props.onClose()}
        ref={e => this.text = e}
      />
    );
  }
}
