export enum SortDir {
  asc = 1,
  desc,
  natural
};

export interface SortColumn {
  column: string;
  dir: SortDir
}