import BaseEvent from "./BaseEvent";

export default class FlexibilityEvent {
  private readonly responseTimestamp: number;
  public provideMessageSent: boolean = false;
  public isActive: boolean;

  constructor(
    public readonly start: number,
    public readonly stop: number,
    public readonly gridFlexibility: number,
    public readonly currentTimestamp: number
  ) {
    this.responseTimestamp =
      currentTimestamp +
      Math.floor(Math.random() * (start - currentTimestamp) + (start - currentTimestamp) * 0.1);
  }

  shouldProvideFlexibility(timestamp: number) {
    return !this.provideMessageSent && this.hasStarted(timestamp);
  }

  hasStarted(timestamp: number): boolean {
    return timestamp >= this.responseTimestamp;
  }

  hasEnded(timestamp: number): boolean {
    return timestamp > this.stop;
  }
}
