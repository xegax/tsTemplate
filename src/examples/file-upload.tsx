import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {createRequestor, Requestor} from 'requestor/requestor';
import {Queue} from 'common/promise';

import {ServerSideData, FileObj, register} from 'apps/docs/model/document';
import {Serializer} from 'serialize/serializer';
import {Menu} from 'controls/menu';
import {TextBox} from 'controls/textbox';

class FilesView extends React.Component<{data: ServerSideData}, {editDescr?: FileObj}> {
  constructor(props) {
    super(props);

    this.state = {};
  }

  onContextMenu(evt: React.MouseEvent<HTMLElement>, fileIdx: number) {
    evt.preventDefault();
    evt.stopPropagation();

    const files = this.props.data.getFiles();
    const items = [
      {
        label: 'Remove',
        command: () => files.remove(fileIdx)
      }
    ];
    Menu.showAt({x: evt.pageX, y: evt.pageY}, <Menu items={items}/>);
  };

  renderDescr(item: FileObj) {
    const edit = this.state.editDescr == item;
    const textbox = edit ? (
      <TextBox
        defaultValue={item.getDescr()}
        onEnter={text => {
          this.setState({editDescr: null});
          item.setDescr(text);
        }}
      />
    ) : null;

    return (
      <div
        style={{position: 'absolute', top: 20, height: 20, left: 0, right: 0, whiteSpace: 'nowrap', backgroundColor: 'white'}}
        onDoubleClick={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          this.setState({editDescr: item});
        }}
      >
        {textbox || item.getDescr()}
      </div>
    );
  }

  render() {
    const data = this.props.data;
    if (!data)
      return null;

    const items = data.getFiles().getSelectedItems().map((item, i) => {
      return (
        <div
          onContextMenu={(evt) => this.onContextMenu(evt, i)}
          key={i}
          style={{position: 'relative', padding: 5, display: 'inline-block', paddingTop: 20, overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: 0, whiteSpace: 'nowrap', backgroundColor: 'white'}}>{item.getName()}</div>
          {this.renderDescr(item)}
          <img title={item.getName()} style={{height: 200}} src={`/data/store/${item.getId()}`}/>
        </div>
      );
    });

    return (<div>{items}</div>);
  }
}

class FileUpload extends React.Component<{requestor: Requestor}, {data?: ServerSideData, progress?: number}> {
  private input: HTMLInputElement;

  private onRef = (e: HTMLInputElement) => {
    this.input = e;
  };

  constructor(props) {
    super(props);
    this.state = {
      progress: 0,
      data: null
    };

    this.updateServerSideData();
    Serializer.startWatch(requestor, () => {
      this.updateServerSideData();
    });
  }

  private updateServerSideData() {
    sr.loadObject<ServerSideData>('1').then(data => this.setState({data}));
  }

  private onDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
    this.input.click();
  };

  private onChange = (event) => {
    const req = this.props.requestor;
    const file = this.input.files[0];

    let id: string;
    Queue.all(
      () => req.sendJSON('create-file', {}, {name: file.name, size: file.size, type: file.type}),
      (res: {id: string}) => id = res.id,
      () => req.sendData('upload-file', {id}, file as any, {
        progress: (evt, type) => type == 'upload' && this.setState({progress: evt.loaded / evt.total})
      }),
      () => this.setState({progress: 0})
    );
  }

  private renderProgress() {
    return (
      <div style={{margin: 5, border: '1px solid black', height: 50}}>
        <div style={{backgroundColor: 'green', width: `${Math.round(this.state.progress * 100)}%`, height: 50}}></div>
      </div>
    );
  }

  render() {
    return (
      <div
        style={{backgroundColor: 'silver', flexGrow: 1, display: 'flex', flexDirection: 'column'}}
        onDoubleClick={this.onDoubleClick}
      >
        {this.renderProgress()}
        <input style={{display: 'none'}} ref={this.onRef} type='file' onChange={this.onChange}/>
        <div style={{position: 'relative', overflow: 'auto'}}>
          <FilesView data={this.state.data}/>
        </div>
      </div>
    );
  }
}

const requestor = createRequestor({urlBase: '/handler'});
const sr = Serializer.remoteStore(requestor);
register(sr.getFactory());

ReactDOM.render(<FileUpload requestor={requestor}/>, getContainer());