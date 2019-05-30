import Content from './content';
import Source from './Source';

class Item {
  public readonly source: Source;
  public readonly fileUri: string;
  public readonly contents: Content[];

  constructor(source: Source, fileUri: string, contents: Content[]) {
    this.source = source;
    this.fileUri = fileUri;
    this.contents = contents;
  }
}

export default Item;
