import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {getContainer} from 'examples-main/helpers';
import {createRequestor} from 'requestor/requestor';

interface State {
  errors?: number;
  data?: Array<Object>;
}

class View extends React.Component<{}, State> {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.loadData();
  }

  loadData() {
    setTimeout(() => {
      requestor.getJSON('stat').then((data: any) => {
        this.setState({data, errors: 0});
        this.loadData();
      }).catch(() => {
        this.setState({errors: this.state.errors + 1});
        this.loadData();
      });
    }, 300);
  }

  makeBet(item) {
    const rate1 = item['rate1'];
    const rate2 = item['rate2'];
    let bet: any;
    if (rate1 > 0) {
      bet = {
        '1xbet': {'1p': item['1xbet'].rates['1p'], id: item['1xbet'].id},
        'maraphon': {'2p': item['maraphon'].rates['2p'], id: item['maraphon'].id}
      };
      console.log(JSON.stringify(bet));
    } else if (rate2 > 0) {
      bet = {
        '1xbet': {'2p': item['1xbet'].rates['2p'], id: item['1xbet'].id},
        'maraphon': {'1p': item['maraphon'].rates['1p'], id: item['maraphon'].id}
      };
      console.log(JSON.stringify(bet));
    } else {
      bet = {
        '1xbet': {'1p': item['1xbet'].rates['1p'], id: item['1xbet'].id},
        'maraphon': {'2p': item['maraphon'].rates['2p'], id: item['maraphon'].id}
      };
      console.log(JSON.stringify(bet));
    }
    requestor.sendJSON('bet', {}, bet);
  }

  render() {
    let children = Array<JSX.Element>();
    const data = this.state.data;
    if (data) {
      children = data.map((item, i) => {
        const players = item['1xbet']['players'];
        const rate1 = item['rate1'];
        const rate2 = item['rate2'];
        return (
          <tr style={{backgroundColor: i % 2 == 0 ? 'silver' : 'white'}}>
            <td>
              <div>{players[0]}</div>
              <div>{players[1]}</div>
            </td>
            <td style={{cursor: 'pointer', backgroundColor: rate1 > 0 ? 'green': 'white'}} onClick={() => this.makeBet(item)}>
              {rate1 + ''}
            </td>
            <td style={{cursor: 'pointer', backgroundColor: rate2 > 0 ? 'green': 'white'}} onClick={() => this.makeBet(item)}>
              {rate2 + ''}
            </td>
            <td>
              {(Date.now() - item['time'])}
            </td>
          </tr>
        );
      });
    }

    return (
      <div>
        <table>
          <tbody>
            {children}
          </tbody>
        </table>
      </div>
    );
  }
}

const requestor = createRequestor({urlBase: '/handler'});
ReactDOM.render(<View/>, getContainer());