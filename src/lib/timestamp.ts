export class Timestamp {
  now(): string {
    return new Date().toISOString();
  }
}
