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
  reject: (err: any) => void
) => void;

interface HandlerHolder {
  handler: Handler<any, any>;
}

interface Server {
  addJsonHandler<GET, POST>(url: string, handler: Handler<GET, POST>);
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
    this.handlerMap[url] = {handler};
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

    if (request.method == 'POST') {
      let postData = '', postJSON;
      request.on('data', data => postData += data);
      request.on('end', () => {
        postData = this.decrypt(postData);
        if (postData.length) {
          try {
            postJSON = JSON.parse(postData);
          } catch (e) {
            console.log(e);
          }
        }
        try {
          holder.handler({get: params, post: postJSON}, writeOK, writeErr);
        } catch (err) {
          writeErr(err);
        }
      });
    } else {
      try {
        holder.handler({get: params}, writeOK, writeErr);
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