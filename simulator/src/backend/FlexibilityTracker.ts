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
  /**
   * Activate the flexibility tracker on a given flexibility event.
   * @param param0 all the params that characterize the flexibility event
   */
  activate({ flexibilityStart, flexibilityStop, flexibilityBaseline }: FlexibilityActivationData) {
    this.#iotTracker = {};
    this.#startTimestamp = flexibilityStart;
    this.#stopTimestamp = flexibilityStop;
    this.#flexibilityBaseline = flexibilityBaseline;
    this.#resetTimestamp = flexibilityStop + 900;
  }
  /**
   * Deactivate the flexibility tracker, because the flexibility event has ended.
   */
  deactivate() {
    this.#startTimestamp = undefined;
    this.#stopTimestamp = undefined;
  }
  /**
   * Parse a reading and update the results of the {@link IoT}
   * @param iot iot that produced the reading
   * @param reading the value of the reading
   * @param timestamp current timestamp provided by the {@link Clock}
   */
  parseReading(iot: IIoT, reading: number, timestamp: number) {
    // If it is the first time this iot is tracked, create the FlexibilityResult object for it
    if (!this.#iotTracker[iot.address])
      this.#iotTracker[iot.address] = new FlexibilityResult(iot.expectedFlexibility, iot.value);

    if (timestamp >= this.#startTimestamp && timestamp <= this.#stopTimestamp) {
      // If the timestamp is between the start and the stop of the flexibility, update the FlexibilityResult object
      this.#iotTracker[iot.address].addFlexibilityValue(reading);
    } else if (timestamp >= this.#resetTimestamp)
      // If the timestamp is after the end of the flexibility, check that the baseline has been restored
      this.#iotTracker[iot.address].addResetValue(reading);
  }
  /**
   * Whether the tracker has reached the end of its usefulness.
   * @param timestamp current timestamp provided by the {@link Clock}
   * @returns whether we have reached the end of the flexibility event and the baseline should have been restored
   */
  public hasEnded(timestamp: number) {
    return timestamp > this.#resetTimestamp;
  }

  public get tracked() {
    return this.#iotTracker;
  }
  /**
   * Format the flexibility results so that they can be used by the {@link Aggregator} 
   * as parameters in the {@link AggregatorContract.endFlexibilityRequest} function.
   */
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
  /**
   * Format the flexibility results so that they can be displayed in the frontend.
   */
  public get result() {
    // Sum the values coming from each IoT
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
    // Return the percentage of the values
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
