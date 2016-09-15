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
  private optionsPerItem: number = 5;
  private stat: TrainerStat;

  constructor(dict: Array<DictItem>) {
    super();
    this.setDicts(dict);
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

  private selectItem(index: number) {
    let dictItem = this.getItemByIndex(index);
    let item = {
      title: dictItem.value[0],
      options: [dictItem.value[1]]
    };

    const count = this.getItemCount();
    let tries = 100;
    while(--tries >= 0) {
      let idx = Math.round(Math.random() * (count - 1));
      let option = this.getItemByIndex(idx % count);
      if (item.options.indexOf(option.value[1]) != -1)
        continue;
      item.options.push(option.value[1]);
      if (item.options.length >= this.optionsPerItem)
        break;
    }

    tries = 5;
    while(--tries >= 0)
      item.options.sort(() => Math.round(Math.random() * 10) >= 5 ? -1 : 1);

    this.item = item;
    this.rightOptionIndex = this.item.options.indexOf(dictItem.value[1]);
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
    this.props.model.selectOption(this.state.choice);
    this.setState({choice: -1});
    play(this.props.model.getItem().title);
  }

  render() {
    let model = this.props.model;
    let item = model.getItem();
    let stat = model.getStat();
    let perc = Math.round((stat.total - stat.wrong) * 100 / stat.total) || 0;
    let choice = this.state.choice;
    
    let apply = null;
    if (choice != -1) {
      apply = <div>Дальше</div>;
    }

    return (
      <div>
        <h3>Тест {model.getIndex() + 1} из {model.getTotal()} (верно: {stat.total - stat.wrong} - {perc}%, не верно: {stat.wrong})</h3>
        <div className={classes.TEST_CARD}>
          <div className={classes.TITLE}><i onClick={e => play(this.props.model.getItem().title)} className={classes.SPEACH}/> {item.title}</div>
          <div className={classes.OPTIONS}>
            {item.options.map((item, i) => (
              <div
                className={
                  className(
                    classes.OPTION,
                    choice != -1 && i == model.getRightOptionIndex() && classes.RIGHT,
                    choice != -1 && i != model.getRightOptionIndex() && choice == i && classes.WRONG
                    )} onClick={e => this.selectOption(i)}
              >
                {item}
              </div>
            ))}
          </div>
          <div className={className(classes.OPTION, classes.NEXT, choice == -1 && classes.HIDE)} onClick={e => this.applySelection()}>Дальше</div>
        </div>
      </div>
    );
  }
}


import {dict} from '../data/eng-dict';

ReactDOM.render(<WorkBook model={new TrainerModel(dict.map(word => ({value: word})))}/>, createContainer());