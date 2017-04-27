import {createServer} from './server';
import {Database} from 'sqlite3';

const srv = createServer(8085);

let db = new Database('data/docs.db', err => {
  if (err)
    console.log(err);
});

interface Doc {
}

srv.addJsonHandler('/handler/doc-list', () => {
});