import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {ObjectFactory} from 'serialize/object-factory';
import {register, DocList, DocBase, DocImage, DocText, PrDoc} from 'examples/docs/document';
import {createRequestor} from 'requestor/requestor';
import {RemoteObjectStore} from 'serialize/obj-store/remote-object-store';
import {Serializer} from 'serialize/serializer';
import {DocManager} from './doc-manager';
import {DocManagerModel} from './doc-manager-model';
import {processRoute, ViewRef} from './routes';
import {PrDocView} from './prdoc-view';
import {PrDocModel} from './prdoc-model';

const factory = new ObjectFactory();
register(factory);

const req = createRequestor('/handler');
const store = new RemoteObjectStore(req);
const db = new Serializer(factory, store);

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
  db.loadObject(args.docId).then((obj: DocBase) => {
    if (obj instanceof DocText) {
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