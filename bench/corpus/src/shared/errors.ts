export class HarborError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
