import {IThenable} from 'promise';
import * as d3 from 'd3';

export interface Requestor {
  sendData(url: string, params?: Object, postData?: any): IThenable<string>;
  getData(url: string, params?: Object): IThenable<string>;
  getJSON(url: string, params?: Object): IThenable<any>;
}

function getUrl(url: string, params: Object): string {
  let l = Object.keys(params || {}).map(key => [key, params[key]].join('='));
  if (l.length > 0) {
    return url + '?' + l.join('&');
  } else {
    return url;
  }
}

class RequestorImpl implements Requestor {
  sendData(url: string, params?: Object, postData?: any): IThenable<string> {
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

  getData(url: string, params?: Object): IThenable<string> {
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

  getJSON(url: string, params?: Object): IThenable<any> {
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

export function createRequestor(): Requestor {
  return new RequestorImpl();
}

let globalRequestor: Requestor;

export function getGlobalRequestor(): Requestor {
  if (globalRequestor == null) {
   globalRequestor = new RequestorImpl();
  }
  return globalRequestor;
}