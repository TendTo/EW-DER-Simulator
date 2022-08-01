import { FlexibilityOptions } from "src/module";
import { IAggregatorContract } from "src/typechain-types";
import { FlexibilityErrorMargin } from "./constants";
import { inErrorMargin } from "./utils";

type IoTFlexibilityData = Record<
  string,
  {
    value: number;
    count: number;
    flexibilityError: boolean;
    expectedFlexibility: number;
  }
>;

export default class FairFlexibilityTracker {
  private iotTracker: IoTFlexibilityData = {};
  private start: number;
  private end: number;

  activate({ flexibilityStart, flexibilityStop }: FlexibilityOptions) {
    this.iotTracker = {};
    this.start = flexibilityStart;
    this.end = flexibilityStop;
  }

  deactivate() {
    this.start = undefined;
    this.end = undefined;
  }

  addIoT(iot: string, expectedFlexibility: number) {
    this.iotTracker[iot] = {
      value: 0,
      count: 0,
      flexibilityError: false,
      expectedFlexibility,
    };
  }

  parseReading(iot: string, reading: number) {
    if (!this.iotTracker[iot]) return;
    if (!inErrorMargin(this.iotTracker[iot].expectedFlexibility, reading, FlexibilityErrorMargin))
      this.iotTracker[iot].flexibilityError = true;
    this.iotTracker[iot].value += reading;
    this.iotTracker[iot].count++;
  }

  public hasEnded(timestamp: number) {
    return timestamp > this.end;
  }

  public get tracked() {
    return this.iotTracker;
  }

  public get results(): IAggregatorContract.FlexibilityResultStruct[] {
    return Object.entries(this.iotTracker).map(([iot, { value, count, flexibilityError }]) => ({
      prosumer: iot,
      flexibility: flexibilityError ? 0 : Math.floor(value / count),
    }));
  }

  public get isActive() {
    return !!this.end;
  }
}
