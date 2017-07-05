import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {DocText, DocList, DocImage, DocBase, register} from 'serialize/document';
import {ListObj} from 'serialize/list-obj';
import {Serializer} from 'serialize/serializer';
import {ObjectFactory} from 'serialize/object-factory';
import {ObjectStore} from 'serialize/object-store';
import {KeyCode} from 'common/keycode';
import {RemoteObjectStore} from 'serialize/remote-object-store';
import {createRequestor} from 'requestor/requestor';

interface Props {
  model: DocList;
}

interface State {
  editItem?: DocBase;
  editText?: string;
}

class DocListView extends React.Component<Props, State> {
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

  private renderDoc(item: DocBase) {
    if (item instanceof DocText)
      return this.renderDocText(item);
    else if (item instanceof DocImage)
      return this.renderDocImage(item);
    return 'unknown doc'; 
  }

  private renderItem(item: DocBase, idx: number) {
    return (
      <div key={'doc-'+item.getId()} style={{border: '1px solid gray', margin: 2}}>
        <div style={{backgroundColor: 'silver', padding: 2, display: 'flex'}}>
          <div style={{flexGrow: 1}}>{`doc id=${item.getId()}`}</div>
          <i
            style={{cursor: 'pointer'}}
            className={'fa fa-remove'}
            onClick={() => {
              this.props.model.getList().remove(idx).then(()=> {
                this.setState({});
              });
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

  private renderField(item: DocBase, type: string, set: (text: string) => void, get: () => string): JSX.Element {
    const onEnter = (e: React.FocusEvent | React.KeyboardEvent) => {
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

  private createDoc = (type: string) => {
    db.makeObject<DocBase>(type).then(doc => {
      this.props.model.getList().append(doc).then(() => {
        this.setState({});
      });
    });
  }

  render() {
    const items = this.props.model.getList().getArray();
    return (
      <div style={{overflow: 'auto'}}>
        <div
          onClick={() => this.createDoc('DocText')}
          style={{cursor: 'pointer', display: 'inline-block', padding: 3}}
        >
          +text doc
        </div>
        <div
          onClick={() => this.createDoc('DocImage')}
          style={{cursor: 'pointer', display: 'inline-block', padding: 3}}
        >
          +image doc
        </div>
        {items.map((item, idx) => this.renderItem(item, idx))}
      </div>
    );
  }
}

const factory = new ObjectFactory();
register(factory);

const req = createRequestor('/handler');
const store = new RemoteObjectStore(req);
const db = new Serializer(factory, store);

function render(model: DocList) {
  ReactDOM.render(<DocListView model={model}/>, getContainer());
}

db.loadObject<DocList>('1')
  .then(render)
  .catch(e => {
    db.makeObject<DocList>('DocList').then(render);
  });
