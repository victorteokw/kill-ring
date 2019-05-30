class Content {

  public readonly start: number;
  public readonly end: number;
  public readonly content: string;

  constructor(start: number, end: number, content: string) {
    this.start = start;
    this.end = end;
    this.content = content;
  }
}

export default Content;
