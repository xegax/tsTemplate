import * as d3 from 'd3';

export interface Requestor {
  sendData(url: string, params?: Object, postData?: string): Promise<string>;
  getData(url: string, params?: Object): Promise<string>;
  getJSON<T extends any>(url: string, params?: Object): Promise<T>;
}

function getUrl(url: string, params: Object): string {
  let l = Object.keys(params || {}).map(key => [key, params[key]].join('='));
  if (l.length > 0) {
    return url + '?' + l.join('&');
  } else {
    return url;
  }
}

export class BaseRequestor implements Requestor {
  private urlBase: string = '';
  private params: Object = {};
  private requestor: Requestor;

  constructor(requestor: Requestor, urlBase?: string, params?: Object) {
    this.urlBase = urlBase || '';
    this.params = params || {};
    this.requestor = requestor;
  }

  private getUrl(url: string) {
    return this.urlBase + url;
  }

  private getParams(params?: Object) {
    return {...this.params, ...params};
  }

  sendData(url: string, params?: Object, postData?: string): Promise<string> {
    return this.requestor.sendData(this.getUrl(url), this.getParams(params), postData);
  }

  getData(url: string, params?: Object): Promise<string> {
    return this.requestor.getData(this.getUrl(url), this.getParams(params));
  }

  getJSON<T extends any>(url: string, params?: Object): Promise<T> {
    return this.requestor.getJSON(this.getUrl(url), this.getParams(params));
  }
}

class RequestorImpl implements Requestor {
  sendData(url: string, params?: Object, postData?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      d3.text(getUrl(url, params)).post(postData, (err, data: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  getData(url: string, params?: Object): Promise<string> {
    return new Promise((resolve, reject) => {
      d3.text(getUrl(url, params)).get((err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  getJSON(url: string, params?: Object): Promise<any> {
    return new Promise((resolve, reject) => {
      d3.json(getUrl(url, params)).get((err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
}

export function createRequestor(urlBase?: string, params?: string): Requestor {
  if (!urlBase && !params) {
    return new RequestorImpl();
  } else {
    return new BaseRequestor(new RequestorImpl(), urlBase, params);
  }
}

let globalRequestor: Requestor;

export function getGlobalRequestor(): Requestor {
  if (globalRequestor == null) {
   globalRequestor = new RequestorImpl();
  }
  return globalRequestor;
}