export class OpenSheetIn {
  constructor(
    public reqId: string,
    public documentId: number,
    public elementId?: number,
    public title?: string,
  ) { }
}