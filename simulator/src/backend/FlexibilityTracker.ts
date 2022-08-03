import FlexibilityResult, { ErrorCheck } from "./FlexibilityResult";

type IoTFlexibilityData = Record<string, FlexibilityResult>;

type FlexibilityActivationData = {
  flexibilityStart: number;
  flexibilityStop: number;
  flexibilityBaseline: number;
};

type FlexibilityResultData = {
  prosumer: string;
  flexibility: number;
  intervalError: boolean;
  startError: boolean;
  stopError: boolean;
};

export default class FairFlexibilityTracker {
  private iotTracker: IoTFlexibilityData = {};
  private startTimestamp: number;
  private stopTimestamp: number;
  private resetTimestamp: number;
  private baseline: number;

  activate({ flexibilityStart, flexibilityStop, flexibilityBaseline }: FlexibilityActivationData) {
    this.iotTracker = {};
    this.startTimestamp = flexibilityStart;
    this.stopTimestamp = flexibilityStop;
    this.baseline = flexibilityBaseline;
    this.resetTimestamp = flexibilityStop + 900;
  }

  deactivate() {
    this.startTimestamp = undefined;
    this.stopTimestamp = undefined;
  }

  addIoT(iot: string, expectedFlexibility: number, baseline: number) {
    this.iotTracker[iot] = new FlexibilityResult(expectedFlexibility, baseline);
  }

  parseReading(iot: string, reading: number, timestamp: number) {
    if (!this.iotTracker[iot]) return;
    let errorCheck: ErrorCheck = undefined;
    if (timestamp > this.startTimestamp && timestamp < this.stopTimestamp)
      errorCheck = "flexibility";
    else if (timestamp > this.resetTimestamp) errorCheck = "baseline";
    this.iotTracker[iot].addValue(reading, errorCheck);
  }

  public hasEnded(timestamp: number) {
    return timestamp > this.resetTimestamp;
  }

  public get tracked() {
    return this.iotTracker;
  }

  public get contractResults(): FlexibilityResultData[] {
    return Object.entries(this.iotTracker).map(
      ([iot, { average, intervalError, startError, stopError }]) => ({
        prosumer: iot,
        flexibility: average,
        intervalError,
        startError,
        stopError,
      })
    );
  }

  public get result() {
    const [succStart, succFlexibility, succReset, totFlexibility] = Object.values(
      this.iotTracker
    ).reduce(
      (acc, { average, intervalError, startError, stopError }) => {
        if (!startError) acc[0]++;
        if (!intervalError) acc[1]++;
        if (!stopError) acc[2]++;
        acc[3] += average;
        return acc;
      },
      [0, 0, 0, 0]
    );
    const nIots = Object.keys(this.iotTracker).length;
    return {
      id: this.startTimestamp,
      successStart: succStart / nIots,
      successReset: succReset / nIots,
      successFlexibility: succFlexibility / nIots,
      averageValue: totFlexibility / nIots,
      success:
        succStart / nIots >= 0.95 && succReset / nIots >= 0.95 && succFlexibility / nIots >= 0.95,
    };
  }

  public get isActive() {
    return !!this.stopTimestamp;
  }

  public get flexibilityBaseline() {
    return this.isActive ? this.baseline : 0;
  }
}
