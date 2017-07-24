import * as React from 'react';
import {OptionalView, ViewRef} from './optional-view';

export {
  ViewRef
};

export function parseParams(): {[key: string]: string} {
  let params = window.location.search.split('?')[1] || '';
  let values = {};
  params.split('&').forEach(keyAndValue => {
    let kv = keyAndValue.split('=');
    values[kv[0]] = kv[1];
  });
  return values;
}

export interface Match {
  params?: Array<string>;
}

export interface RouteItem {
  match?: Match;
  view: (ctrl: ViewRef, params?: {[key: string]: string}) => any;
}

export function processRoute(routes: Array<RouteItem>): JSX.Element {
  let params = parseParams();
  for (let n = 0; n < routes.length; n++ ) {
    const routeItem = routes[n];
    if (!routeItem.match && !routeItem.view)
      return <div>route.view expected for {n} item</div>;

    if (!routeItem.match)
      return <OptionalView onInit={ctrl => routeItem.view(ctrl)}/>;

    let args = {};
    Object.keys(params).forEach(key => {
      if (routeItem.match.params.indexOf(key) != -1)
          args[key] = params[key];
    });
    if (Object.keys(args).length == routeItem.match.params.length)
        return <OptionalView onInit={ctrl => routeItem.view(ctrl, args)}/>;
  }
  return <div>route is fail</div>;
}