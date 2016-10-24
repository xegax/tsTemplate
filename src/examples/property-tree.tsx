import {assign, cloneDeep, isEqual} from 'lodash';
import * as lodash from 'lodash';

class PropertyTree<T extends Object> {
  private base: T;
  private modifyStack = Array<T>();
  private keys: Array<string>;
  private top: T;

  constructor(base: T) {
    this.base = base;
    this.keys = Object.keys(base);
    this.modifyStack.push(cloneDeep(this.base));
    this.updateTop();
  }

  private updateTop() {
    let props: T = {} as T;
    this.keys.forEach(key => {
      for (let n = this.modifyStack.length - 1; n >= 0; n--) {
        let curr = this.modifyStack[n];
        if (key in curr) {
          return props[key] = curr[key];
        }
      }
    });
    this.top = props;
  }

  getValues(): T {
    return this.top;
  }

  setValues(values: T): T {
    let currProps = this.getValues();
    let props: T;
    Object.keys(values).forEach(key => {
      if (key in currProps == false)
        throw `value with name = ${key} not defined`;
      
      if (currProps[key] === values[key])
        return;
      
      if (props == null)
        props = {} as T;

      props[key] = values[key];
    });

    if (props != null) {
      let keys1 = Object.keys(this.modifyStack[this.modifyStack.length - 1]);
      let keys2 = Object.keys(props);
      if (isEqual(keys1, keys2)) {
        if (this.modifyStack.length > 1)
          this.modifyStack[this.modifyStack.length - 1] = props;
      } else {
        this.modifyStack.push(props);
      }
      
      this.updateTop();
    }

    return this.getValues();
  }
}


interface Component {
  border: boolean;
  font: string;
  label: string;
  size: number;
}

let props = new PropertyTree<Component>({
  border: false,
  font: 'Tahoma',
  label: 'this test',
  size: 10
});

props.setValues({ border: true, size: 12} as any);
props.setValues({ label: 'this is test2' } as any);
props.setValues({ label: 'this is test4' } as any);
props.getValues();
window['lodash'] = lodash;