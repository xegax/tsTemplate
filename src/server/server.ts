import * as http from 'http';
import * as url from 'url';
import {Encryptor, EmptyEncryptor} from '../common/encryptor';

interface Params<GET, POST> {
  get: GET;
  post?: POST;
}

type Handler<GET, POST> = (
  params: Params<GET, POST>,
  resolve: (result: any) => void,
  reject: (err: any) => void,
  holder: Array<() => void>
) => void;

type DataHandler<GET> = (
  params: {get: GET, offs: number, count: number, post: Buffer},
  resolve: (result: any) => void,
  reject: (err: any) => void
) => void;

interface HandlerHolder {
  type: 'json' | 'data';
  handler: Handler<any, any> | DataHandler<any>;
  closed: () => void;
}

interface Server {
  addJsonHandler<GET, POST>(url: string, handler: Handler<GET, POST>, closed?: () => void);
  addDataHandler<GET>(url: string, handler: DataHandler<GET>);
}

function parseUrl(str) {
  let parsed = url.parse(str, true);
  let params = {};
  Object.keys(parsed.query).forEach((key) => {
    params[key.trim()] = parsed.query[key].trim();
  });

  return {
    url: parsed.pathname,
    params
  };
}

interface ServerParams {
  encryptor?: Encryptor;
  port: number;
  baseUrl?: string;
}

export class ServerImpl implements Server  {
  private encryptor: Encryptor;
  private handlerMap: {[url:string]: HandlerHolder} = {};
  private baseUrl: string = '';

  constructor(params: ServerParams) {
    this.encryptor = params.encryptor || new EmptyEncryptor();
    this.baseUrl = params.baseUrl || '';
  }

  private encrypt(s: string): string {
    return this.encryptor.encrypt(s);
  }

  private decrypt(s: string): string {
    return this.encryptor.decrypt(s);
  }

  addJsonHandler<GET, POST>(url: string, handler: Handler<GET, POST>) {
    this.handlerMap[url] = {type: 'json', handler, closed: () => {}};
  }

  addDataHandler<GET>(url: string, handler: DataHandler<GET>) {
    this.handlerMap[url] = {type: 'data', handler, closed: () => {}};
  }

  findHandler(url: string): HandlerHolder {
    if (this.baseUrl.length)
      if (url.substr(0, this.baseUrl.length) == this.baseUrl)
        url = url.substr(this.baseUrl.length);

    return this.handlerMap[this.decrypt(url)];
  }

  handleRequest(request: http.IncomingMessage, response: http.ServerResponse) {
    let {url, params} = parseUrl(request.url);
    let holder = this.findHandler(url);
    if (!holder) {
      response.writeHead(404, {'Content-Type': 'application/json'});
      response.write(`${url} handler not found`);
      return response.end();
    }
    
    const writeOK = (data) => {
      //console.log(data);
      let res = typeof data == 'string' ? data : JSON.stringify(data);
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.write(this.encrypt(res));
      response.end();
    };

    const writeErr = (err) => {
      response.writeHead(500, {'Content-Type': 'application/json'});
      response.write(err.toString());
      response.end();
    };

    const closes = [];
    request.connection.on('close', () => {
      closes.forEach(handler => handler());
      //console.log('conn close');
    });
    //console.log(url);

    if (request.method == 'POST') {
      const jsonHandler = holder.handler as Handler<any, any>;
      const dataHandler = holder.handler as DataHandler<any>;

      let postData = '';
      let postJSON: any;
      let offsData = 0;

      request.on('data', (data: Buffer) => {
        if (holder.type == 'json') {
          postData += data.toString();
        } else {
          dataHandler({get: params, post: data, offs: offsData, count: data.byteLength}, writeOK, writeErr);
          offsData += data.byteLength;
        }
      });
      request.on('end', () => {
        if (holder.type == 'json' && postData.length) {
          try {
            postJSON = JSON.parse(this.decrypt(postData.toString()));
          } catch (e) {
            console.log(e);
          }
        } else {
          //console.log('end', offsData);
        }
        try {
          if (holder.type == 'json') {
            jsonHandler({get: params, post: postJSON}, writeOK, writeErr, closes);
          } else {
            dataHandler({get: params, offs: offsData, count: 0, post: null}, writeOK, writeErr);
          }
        } catch (err) {
          writeErr(err);
        }
      });
    } else {
      try {
        (holder.handler as Handler<any, any>)({get: params}, writeOK, writeErr, closes);
      } catch (err) {
        writeErr(err);
      }
    }
  }
}

export function createServer(params: ServerParams): Server {
  let impl = new ServerImpl(params);
  let server = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
    impl.handleRequest(request, response);
  });
  server.listen(params.port);

  return impl;
}