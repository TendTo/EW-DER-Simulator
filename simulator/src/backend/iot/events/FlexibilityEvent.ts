/**
 * A flexibility event has been emitted by the smart contract.
 * Each flexibility has a startTimestamp, a stopTimestamp and a flexibility value.
 */
export default class FlexibilityEvent {
  private readonly startIoTFlexibilityTimestamp: number;
  private readonly endIoTFlexibilityTimestamp: number;
  public isActive: boolean = false;
  public isConfirmed: boolean = false;

  constructor(
    public readonly start: number,
    public readonly stop: number,
    public readonly flexibility: number,
    public readonly currentTimestamp: number
  ) {
    this.startIoTFlexibilityTimestamp = currentTimestamp;
    this.endIoTFlexibilityTimestamp = stop;
  }

  hasStarted(timestamp: number): boolean {
    return timestamp >= this.startIoTFlexibilityTimestamp;
  }

  hasEnded(timestamp: number): boolean {
    return timestamp > this.endIoTFlexibilityTimestamp;
  }
}
