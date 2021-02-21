export { };
declare global {
  interface String {
    insert: (this: string, str: string, num: number) => void;
  }
}