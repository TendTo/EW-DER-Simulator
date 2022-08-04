export default class FlexibilityEvent {
  private readonly startIoTFlexibilityTimestamp: number;
  private readonly endIoTFlexibilityTimestamp: number;
  public provideMessageSent: boolean = false;
  public isActive: boolean = false;

  constructor(
    public readonly start: number,
    public readonly stop: number,
    public readonly flexibility: number,
    public readonly currentTimestamp: number
  ) {
    // currentTimestamp + Math.floor(Math.random() * (start - currentTimestamp));
    // this.endIoTFlexibilityTimestamp = stop + Math.floor(Math.random() * 15 * 60);
    this.startIoTFlexibilityTimestamp = start;
    this.endIoTFlexibilityTimestamp = stop;
  }

  shouldProvideFlexibility(timestamp: number) {
    return !this.provideMessageSent && this.hasStarted(timestamp) && !this.hasEnded(timestamp);
  }

  hasStarted(timestamp: number): boolean {
    return timestamp >= this.startIoTFlexibilityTimestamp;
  }

  hasEnded(timestamp: number): boolean {
    return timestamp >= this.endIoTFlexibilityTimestamp;
  }
}
