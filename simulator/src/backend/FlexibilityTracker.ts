import FlexibilityResult, { ErrorCheck } from "./FlexibilityResult";
import { IIoT } from "./iot";

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
  #iotTracker: IoTFlexibilityData = {};
  /** Modulazione a regime: inizio del regime, fine del transitorio */
  #startTimestamp: number;
  /** Termine della modulazione e inizio del ritorno alla baseline */
  #stopTimestamp: number;
  #resetTimestamp: number;
  #flexibilityBaseline: number;

  activate({ flexibilityStart, flexibilityStop, flexibilityBaseline }: FlexibilityActivationData) {
    this.#iotTracker = {};
    this.#startTimestamp = flexibilityStart;
    this.#stopTimestamp = flexibilityStop;
    this.#flexibilityBaseline = flexibilityBaseline;
    this.#resetTimestamp = flexibilityStop + 900;
  }

  deactivate() {
    this.#startTimestamp = undefined;
    this.#stopTimestamp = undefined;
  }

  parseReading(iot: IIoT, reading: number, timestamp: number) {
    if (!this.#iotTracker[iot.address])
      this.#iotTracker[iot.address] = new FlexibilityResult(iot.expectedFlexibility, iot.value);

    if (timestamp >= this.#startTimestamp && timestamp <= this.#stopTimestamp) {
      this.#iotTracker[iot.address].addFlexibilityValue(reading);
    } else if (timestamp >= this.#resetTimestamp)
      this.#iotTracker[iot.address].addResetValue(reading);
  }

  public hasEnded(timestamp: number) {
    return timestamp > this.#resetTimestamp;
  }

  public get tracked() {
    return this.#iotTracker;
  }

  public get contractResults(): FlexibilityResultData[] {
    return Object.entries(this.#iotTracker).map(
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
    const [succStart, succFlexibility, succReset, averageFlexibility] = Object.values(
      this.#iotTracker
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
    const nIots = Object.keys(this.#iotTracker).length;
    return {
      id: this.#startTimestamp,
      successStart: succStart / nIots,
      successReset: succReset / nIots,
      successFlexibility: succFlexibility / nIots,
      averageValue: (averageFlexibility - this.flexibilityBaseline) / this.#flexibilityBaseline,
      success:
        succStart / nIots >= 0.95 && succReset / nIots >= 0.95 && succFlexibility / nIots >= 0.95,
    };
  }

  public get isActive() {
    return !!this.#stopTimestamp;
  }

  public get flexibilityBaseline() {
    return this.isActive ? this.#flexibilityBaseline : 0;
  }

  public get flexibilityStart() {
    return this.isActive ? this.#startTimestamp : 0;
  }

  public get flexibilityStop() {
    return this.isActive ? this.#stopTimestamp : 0;
  }

  public get flexibilityReset() {
    return this.isActive ? this.#resetTimestamp : 0;
  }
}
