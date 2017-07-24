import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {DocDesc, DocText, DocList, DocImage, DocBase, PrDoc, register} from '../model/document';
import {ListObj} from 'serialize/list-obj';
import {Serializer} from 'serialize/serializer';
import {ObjectFactory} from 'serialize/object-factory';
import {KeyCode} from 'common/keycode';
import {RemoteObjectStore} from 'serialize/obj-store/remote-object-store';
import {createRequestor} from 'requestor/requestor';
import {startDragging} from 'common/start-dragging';
import {Queue} from 'common/promise';
import {DocManagerModel} from '../model/doc-manager-model';

interface Props {
  model: DocManagerModel;
}

interface State {
  editItem?: DocDesc;
  editText?: string;
  drag?: DocDesc;
  moveIdx?: number;
}

export class DocManager extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {};
  }

  private renderDocText(item: DocText) {
    return 'doc text';
  }

  private renderDocImage(item: DocImage) {
    return 'doc image';
  }

  private renderDoc(item: DocDesc) {
    return item.getType(); 
  }

  private getDocIndex(el: HTMLElement) {
    while (el) {
      const dataIdx = el.getAttribute('data-idx');
      if (dataIdx != null)
        return +dataIdx;
      el = el.parentElement;
    }
    return -1;
  }

  private onDragStart = (e, doc: DocDesc, idx: number) => {
    let tgt: HTMLElement;
    startDragging({x: 0, y: 0, minDist: 5}, {
      onDragStart: () => {
        this.setState({drag: doc});
      },
      onDragging: (e) => {
        if (tgt == e.event.target)
          return;
        tgt = e.event.target as HTMLElement;
        let moveIdx = this.getDocIndex(tgt);
        if (moveIdx != this.state.moveIdx)
          this.setState({moveIdx});
      },
      onDragEnd: () => {
        let moveIdx = this.state.moveIdx;
        if (moveIdx != idx) {
          Queue.all(
            () => this.props.model.getList().remove(idx),
            () => this.props.model.getList().append(doc, moveIdx),
            () => this.setState({})
          );
        }
        this.setState({drag: null, moveIdx: -1});
      }
    })(e);
  }

  private renderItem(item: DocDesc, idx: number) {
    return (
      <div
        key={'doc-'+item.getId()}
        data-idx={'' + idx}
        style={{border: '1px solid gray', margin: 2, opacity: this.state.drag == item ? 0.5 : 1}}
        onMouseDown={e => this.onDragStart(e, item, idx)}
      >
        <div
          onClick={e => window.location.assign(`docs.html?docId=${item.getDocId()}`)}
          style={{cursor: 'pointer', backgroundColor: 'silver', padding: 2, display: 'flex'}}>
          <div style={{flexGrow: 1}}>{`doc id=${item.getDocId()}`}</div>
          <i
            style={{cursor: 'pointer'}}
            className={'fa fa-remove'}
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();

              this.props.model.getList().remove(idx).then(this.updateView);
            }}
          />
        </div>
        {this.renderField(item, 'name', item.setName, item.getName)}
        {this.renderField(item, 'desc', item.setDescr, item.getDescr)}
        {this.renderDoc(item)}
      </div>
    );
  }

  private editor: HTMLInputElement;
  private onInputRef = (e: HTMLInputElement) => this.editor = e;

  private renderField(item: DocDesc, type: string, set: (text: string) => void, get: () => string): JSX.Element {
    const onEnter = (e: React.FocusEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
      set.call(item, (e.currentTarget as HTMLInputElement).value);
      this.setState({editText: null});
    };

    if (item == this.state.editItem && this.state.editText == type)
      return (
        <input
          ref={this.onInputRef}
          type='text'
          defaultValue={get.call(item)}
          onBlur={onEnter}
          onKeyDown={e => e.keyCode == KeyCode.Enter && onEnter(e)}
        />
      );

    return (
      <div
        onDoubleClick={e => {
          this.setState({editText: type, editItem: item}, () => {
            this.editor.focus();
            this.editor.setSelectionRange(0, get.call(item).length);
          });
        }}
      >
        {`${type}=${get.call(item)}`}
      </div>
    );
  }

  private updateView = () => this.setState({});


  render() {
    const model = this.props.model;
    const list = this.props.model.getList();
    let items = new Array<DocDesc>();
    for (let n = 0; n < list.getLength(); n++) {
      let item = list.get(n);
      if (!item)
        break;
      items.push(item);
    }

    return (
      <div style={{overflow: 'auto'}}>
        <div
          onClick={() => model.createDoc('DocText').then(this.updateView)}
          style={{cursor: 'pointer', display: 'inline-block', padding: 3}}
        >
          +text doc
        </div>
        <div
          onClick={() => model.createDoc('DocImage').then(this.updateView)}
          style={{cursor: 'pointer', display: 'inline-block', padding: 3}}
        >
          +image doc
        </div>
        <div
          onClick={() => model.createDoc(PrDoc.getDesc().classId).then(this.updateView)}
          style={{cursor: 'pointer', display: 'inline-block', padding: 3}}
        >
          +presentation doc
        </div>
        <div>{'items: ' + list.getLength()}</div>
        {items.map((item, idx) => this.renderItem(item, idx))}
      </div>
    );
  }
}