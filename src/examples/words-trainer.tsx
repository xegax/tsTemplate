import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {createContainer} from 'examples-main/helpers';
import {Publisher} from 'common/publisher';
import {className} from 'common/common';

interface DictItem {
  value: Array<string>;
}

interface Exercise {
  title: string;
  options: Array<string>;
}

enum TrainerModelEvents {
  TrainerUpdate = 1
}

interface TrainerStat {
  total: number;
  wrong: number;
}

class TrainerModel extends Publisher {
  private dict = Array<DictItem>();
  private order = Array<number>();

  private currIndex: number = 0;
  private item: Exercise;
  private rightOptionIndex: number;
  private optionsPerItem: number = 4;
  private stat: TrainerStat;
  private invertOriginTranslate = false;

  constructor(dict: Array<DictItem>) {
    super();
    this.setDicts(dict);
  }

  getOriginToTranslate() {
    return this.invertOriginTranslate;
  }

  setOriginToTranslate(value: boolean) {
    if (this.invertOriginTranslate == value)
      return;

    this.invertOriginTranslate = value;
    this.updateVersion(TrainerModelEvents.TrainerUpdate);
    this.setDicts(this.dict);
  }

  getIndex(): number {
    return this.currIndex;
  }

  getTotal(): number {
    return this.dict.length;
  }

  getRightOptionIndex() {
    return this.rightOptionIndex;
  }

  getItem(): Exercise {
    return this.item;
  }

  getStat() {
    return this.stat;
  }

  selectOption(optionIdx: number) {
    if (optionIdx != this.rightOptionIndex) {
      this.stat.wrong++;
    }

    this.stat.total++;
    this.currIndex++;
    if (this.currIndex >= this.getItemCount()) {
      this.currIndex = 0;
      this.shuffle();
    }
    this.selectItem(this.currIndex);
    this.updateVersion(TrainerModelEvents.TrainerUpdate);
  }

  shuffle() {
    this.order = [];
    while (this.order.length < this.dict.length)
      this.order.push(this.order.length);

    let n = 0;
    while (++n < 2)
      this.order.sort(() => Math.round(Math.random() * 10) >= 5 ? -1 : 1);
  }

  private setDicts(dict: Array<DictItem>) {
    this.dict = dict.slice();
    this.shuffle();

    this.currIndex = 0;
    this.selectItem(this.currIndex);
    this.stat = {
      total: 0,
      wrong: 0
    };
    this.updateVersion(TrainerModelEvents.TrainerUpdate);
  }

  private getItemByIndex(index: number) {
    return this.dict[this.order[index]];
  }

  private getItemCount() {
    return this.order.length;
  }

  private getItemOrigin(item: DictItem) {
    if (this.invertOriginTranslate)
      return item.value[1];
    return item.value[0];
  }

  private getItemTranslate(item: DictItem) {
    if (this.invertOriginTranslate)
      return item.value[0];
    return item.value[1];
  }

  private selectItem(index: number) {
    let dictItem = this.getItemByIndex(index);
    let item = {
      title: this.getItemOrigin(dictItem),
      options: [this.getItemTranslate(dictItem)]
    };

    const count = this.getItemCount();
    let tries = 100;
    while (--tries >= 0) {
      let idx = Math.round(Math.random() * (count - 1));
      let option = this.getItemByIndex(idx % count);
      if (item.options.indexOf(this.getItemTranslate(option)) != -1)
        continue;

      item.options.push(this.getItemTranslate(option));
      if (item.options.length >= this.optionsPerItem)
        break;
    }

    tries = 5;
    while (--tries >= 0)
      item.options.sort(() => Math.round(Math.random() * 10) >= 5 ? -1 : 1);

    this.item = item;
    this.rightOptionIndex = this.item.options.indexOf(this.getItemTranslate(dictItem));
  }
}

interface Props {
  model: TrainerModel;
}

interface State {
  choice: number;
}

const classes = {
  TEST_CARD: 'test-card',
  TITLE: 'test-card--title',
  OPTIONS: 'test-card--options',
  OPTION: 'test-card--option',
  RIGHT: 'test-card--right',
  WRONG: 'test-card--wrong',
  NEXT: 'test-card--next',
  HIDE: 'hide',
  SPEACH: 'fa fa-volume-up'
};

declare function SpeechSynthesisUtterance(text?: string): void;
declare var window: {
  speechSynthesis: {
    speak: (msg) => void;
    getVoices(): Array<any>;
  }
};

function play(text: string) {
  var ttsMsg =  new SpeechSynthesisUtterance();
  ttsMsg.rate = 0.5;
  ttsMsg.volume = 1;
  ttsMsg.text = text;
  ttsMsg.voice = window.speechSynthesis.getVoices()[2];

  window.speechSynthesis.speak(ttsMsg);
}

class WorkBook extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      choice: -1
    };
  }

  private updateTrainer = () => {
    this.forceUpdate();
  }

  componentWillMount() {
    this.props.model.addSubscriber(this.updateTrainer);
  }

  componentWillUnmount() {
    this.props.model.removeSubscriber(this.updateTrainer);
  }

  selectOption(choice: number) {
    if (this.state.choice == -1) {
      this.setState({choice});
    }
  }

  applySelection() {
    let model = this.props.model;
    model.selectOption(this.state.choice);
    this.setState({choice: -1});
    play(model.getItem().title);
  }

  renderTitle(item: Exercise) {
    return (
      <div className={classes.TITLE}>
        <i onClick={e => play(item.title)} className={classes.SPEACH}/>
        {item.title}
      </div>
    );
  }

  renderOption(item: string, i: number) {
    let model = this.props.model;
    let choice = this.state.choice;
    let choiceIsValid = choice != -1;
    let isRight = i == model.getRightOptionIndex();

    const classValue = className(
      classes.OPTION,
      choiceIsValid && isRight && classes.RIGHT,
      choice == i && !isRight && classes.WRONG
    );

    return (
      <div className={classValue} onClick={e => this.selectOption(i)}>
        {item}
      </div>
    );
  }

  renderOptions(item: Exercise) {
    return (
      <div className={classes.OPTIONS}>
        {item.options.map((item, i) => this.renderOption(item, i))}
      </div>
    );
  }

  renderNextButton() {
    let choiceIsValid = this.state.choice != -1;
    let classValue = className(
      classes.OPTION,
      classes.NEXT,
      !choiceIsValid && classes.HIDE
    );

    return (
      <div className={classValue} onClick={e => this.applySelection()}>Дальше</div>
    );
  }

  renderModes() {
    return (
      <div>
        <div>
          <label onClick={e => this.props.model.setOriginToTranslate(false)}>
            <input checked={!this.props.model.getOriginToTranslate()} type='radio'/>
            Англейский <i className={'fa fa-arrow-right'}/> Русский
          </label>
        </div>
        <div>
          <label onClick={e => this.props.model.setOriginToTranslate(true)}>
            <input checked={this.props.model.getOriginToTranslate()} type='radio'/>
            Русский <i className={'fa fa-arrow-right'}/> Английский
          </label>
        </div>
      </div>
    );
  }

  render() {
    let model = this.props.model;
    let item: Exercise = model.getItem();
    let stat = model.getStat();
    let perc = Math.round((stat.total - stat.wrong) * 100 / stat.total) || 0;

    return (
      <div>
        {this.renderModes()}
        <h3>Тест {model.getIndex() + 1} из {model.getTotal()}
         (верно: {stat.total - stat.wrong} - {perc}%, не верно: {stat.wrong})</h3>
        <div className={classes.TEST_CARD}>
          {this.renderTitle(item)}
          {this.renderOptions(item)}
          {this.renderNextButton()}
        </div>
      </div>
    );
  }
}

import {dict} from '../data/eng-dict';
ReactDOM.render(<WorkBook model={new TrainerModel(dict.map(word => ({value: word})))}/>, createContainer());
