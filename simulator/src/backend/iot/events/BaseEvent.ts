export default class BaseEvent {
  constructor(
    public readonly intensity: number,
    public readonly duration: number,
    public readonly startTimestamp: number
  ) {}

  hasEnded(timestamp: number) {
    return timestamp > this.startTimestamp + this.duration;
  }
}
