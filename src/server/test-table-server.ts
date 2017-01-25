import * as http from 'http';
import {createServer} from './server';

var srv = createServer(8088);
srv.addJsonHandler<{}, {}>('/table', (params, resolve) => {
  resolve(params);
});