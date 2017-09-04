import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {Tree, TreeItem} from 'controls/tree/tree';
import {FitToParent} from 'common/fittoparent';

function getItems(parent: TreeItem): Promise<Array<TreeItem>> {
  const max = 5 + Math.round(Math.random() * 5);
  const items: Array<TreeItem> = [];
  while (items.length < max) {
    items.push({
      label: 'item ' + (items.length + 1),
      getItems: getItems
    });
  }

  return new Promise<Array<TreeItem>>((resolve, reject) => {
    setTimeout(() => {
      resolve(items);
    }, 1);
  });
}

const items = [
  {
    label: 'item 1',
    getItems
  }, {
    label: 'item 2',
    getItems
  }, {
    label: 'item 3',
    getItems
  }, {
    label: 'item 4'
  }, {
    label: 'item 5'
  }, {
    label: 'item 6'
  }
];

ReactDOM.render(<FitToParent><Tree items={items}/></FitToParent>, getContainer());