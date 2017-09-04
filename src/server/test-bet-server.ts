import { createServer } from './server';
process.setMaxListeners(0);
import * as fs from 'fs';

const srv = createServer({
  port: 8088,
  baseUrl: '/handler/'
});

let players = {};

let counter = 0;

function calcRate(k1, k2) {
  return 1 / (1 / k1 + 1 / k2) - 1;
}

function memberRates(rates1, rates2) {
  let r1: number = rates1['1p'];
  let r2: number = rates2['2p'];

  return Math.round(calcRate(r1, r2) * 1000) / 1000;
}

srv.addJsonHandler<{}, Array<{max1p: number, max2p: number, type: string, rates: Array<number>, source: string, id: string, score: string, players: Array<string> }>>('new-data', (params, done, error) => {
  params.post.forEach(item => {
    const player = players[item.players[0]] || (players[item.players[0]] = {});
    player[item.source] = item;
    item.max1p = Math.max(item.max1p, item.rates['1p']) || item.rates['1p'];
    item.max2p = Math.max(item.max2p, item.rates['2p']) || item.rates['2p'];
  });

  let events = 0;
  Object.keys(players).forEach(pl => {
    const item = players[pl];
    const sources = Object.keys(item);
    if (sources.length > 1) {
      events++;
      const rate1 = memberRates(item['1xbet'].rates, item['maraphon'].rates) || 0;
      const rate2 = memberRates(item['maraphon'].rates, item['1xbet'].rates) || 0;

      if (rate1 > 0 || (rate2 > 0 && rate1 > rate2)) {
        state[item['1xbet'].id] = {'1p': item['1xbet'].rates['1p']};
        state[item['maraphon'].id] = {'2p': item['maraphon'].rates['2p']};
      } else if (rate2 > 0 || (rate1 > 0 && rate2 > rate1)) {
        state[item['1xbet'].id] = {'2p': item['1xbet'].rates['2p']};
        state[item['maraphon'].id] = {'1p': item['maraphon'].rates['1p']};
      } else {
        state[item['1xbet'].id] = {};
        state[item['maraphon'].id] = {};
      }

      if (rate1 != item['rate1'] || rate2 != item['rate2']) {
        item['rate1'] = rate1;
        item['rate2'] = rate2;
        if (rate1 > 0 || rate2 > 0) {
          console.log(pl, ' vs ', item['1xbet'].players[1], item['rate1'], item['rate2'], (Date.now() - item['time']) / 1000);
          console.log(item['1xbet'].rates);
          console.log(item['maraphon'].rates);
          console.log('');
        }
        item['time'] = Date.now();
      }
    }
  });

  done('ok');
});

let state = {bets: []};

srv.addJsonHandler<{}, {source: string}>('state', (params, done) => {
  done(state);
});

srv.addJsonHandler('stat', (params, done) => {
  let arr = [];
  Object.keys(players).forEach(k => {
    const sources = players[k];
    if (Object.keys(sources).length > 1) {
      arr.push(sources);
    }
  });
  done(arr);
});

srv.addJsonHandler('bet', (params, done) => {
  console.log(params.post);
  state.bets.push(params.post);
  done({});
});