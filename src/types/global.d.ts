export { };
declare global {
  interface String {
    insert: (index: number, value: string) => string;
    delete: (from: number, length?: number) => string;
  }
}