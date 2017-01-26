import * as http from 'http';
import * as url from 'url';

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


export class ServerImpl implements Server  {
  private handlerMap: {[url:string]: HandlerHolder} = {};

  addJsonHandler<GET, POST>(url: string, handler: Handler<GET, POST>) {
    this.handlerMap[url] = {handler};
  }

  findHandler(url: string): HandlerHolder {
    return this.handlerMap[url];
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
      response.write(res);
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

export function createServer(port: number): Server {
  let impl = new ServerImpl();
  let server = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
    impl.handleRequest(request, response);
  });
  server.listen(port);

  return impl;
}