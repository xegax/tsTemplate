import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {ObjectFactory} from 'serialize/object-factory';
import {createRequestor} from 'requestor/requestor';
import {RemoteObjectStore} from 'serialize/obj-store/remote-object-store';
import {Serializer} from 'serialize/serializer';

import {DocManager} from './view/doc-manager';
import {PrDocView} from './view/prdoc-view';

import {PrDocModel} from './model/prdoc-model';
import {DocManagerModel} from './model/doc-manager-model';
import {
  register,
  DocDesc,
  DocList,
  DocBase,
  DocImage,
  DocText,
  PrDoc,
  CharacterTable
} from './model/document';
import {CharacterView} from './view/characters';

import {processRoute, ViewRef} from '../routes';

const req = createRequestor({urlBase: '/handler'});
const db = Serializer.remoteStore(req);
register(db.getFactory());

class Container extends React.Component<React.HTMLProps<any>, {}> {
  render() {
    return (
      <div style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex', flexGrow: 1}}>
        {this.props.children}
      </div>
    );
  }
}

function docView(ref: ViewRef, args: {docId: string}) {
  db.loadObject(args.docId).then(obj => {
    if (obj instanceof CharacterTable) {
      ref.setView(<CharacterView table={obj} createObject={(name, args) => db.makeObject(name, args)}/>);
    } else if (obj instanceof DocText) {
      ref.setView(<div>DocText</div>);
    } else if (obj instanceof DocImage) {
      ref.setView(<div>DocImage</div>);
    } else if (obj instanceof PrDoc) {
      let model = PrDocModel.make(obj, db);
      ref.setView(<PrDocView model={model}/>);
    } else {
      ref.setView(<div>Unknown doc</div>);
    }
  });
}

function docList(ref: ViewRef) {
  DocManagerModel.make(db).then(mgr => {
    ref.setView(<DocManager model={mgr}/>);
  });
}

let routes = [
  {
    match: {params: ['docId']},
    view: docView
  }, {
    view: docList
  }
];

const view = processRoute(routes);
ReactDOM.render(<Container>{view}</Container>, document.getElementById('container'));