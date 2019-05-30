import { Clipboard, workspace } from 'vscode';
import Item from './item';

class Ring {

  private store: Item[];

  constructor() {
    this.store = [];
  }

  get length(): number {
    return this.store.length;
  }
  set length(length: number) {
    this.store.splice(0, this.store.length - length);
  }

  public append(item: Item) {
    this.store.push(item);
  }

  public getItem(index: number = 0) {
    return this.store[this.store.length - index - 1];
  }
}

export default Ring;
