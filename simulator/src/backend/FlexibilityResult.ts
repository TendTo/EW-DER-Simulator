import { FlexibilityErrorMargin } from "./constants";
import { inErrorMargin } from "./utils";

export type ErrorCheck = "flexibility" | "baseline";

export default class FlexibilityResult {
  #value: number = 0;
  #count: number = 0;
  #startError: boolean = undefined;
  #intervalError: boolean = false;
  #stopError: boolean = undefined;
  #providingFlexibility: boolean = false;

  constructor(
    public readonly expectedFlexibility: number,
    public readonly expectedBaseline: number
  ) {}

  public get value() {
    return this.#value;
  }

  public get average() {
    return this.#value / this.#count;
  }

  public get intervalError() {
    return this.#intervalError;
  }

  public get startError() {
    return this.#startError;
  }

  public get stopError() {
    return this.#stopError;
  }

  public get providingFlexibility() {
    return this.#providingFlexibility;
  }

  public addValue(value: number, errorCheck?: ErrorCheck) {
    if (errorCheck === "flexibility") {
      if (this.#startError === undefined)
        this.#startError = !inErrorMargin(value, this.expectedFlexibility, FlexibilityErrorMargin);
      this.#value += value;
      this.#count++;
      this.#intervalError =
        this.#intervalError ||
        !inErrorMargin(value, this.expectedFlexibility, FlexibilityErrorMargin);
    } else if (this.#stopError === undefined && errorCheck === "baseline")
      this.#stopError = !inErrorMargin(value, this.expectedBaseline, FlexibilityErrorMargin);
  }

  public startProvidingFlexibility() {
    this.#providingFlexibility = true;
  }
}
