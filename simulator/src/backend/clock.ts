import { ClockOptions } from "../module";
import { Season } from "./constants";

type TickCallback = (clock: Clock, timestamp: number) => void;

/**
 * Class that simulates a clock.
 * Each second, all the functions in the list are called,
 * passing the time as argument.
 */
export default class Clock {
  private readonly startingTimestamp: number;
  private callbacks: TickCallback[];
  private isRunning: boolean;
  private timer: NodeJS.Timer;
  private tickIncrement: number;
  private tickInterval: number;
  private _timestamp: number;

  /**
   * Creates a new clock.
   */
  constructor({
    startingTimestamp = Math.floor(Date.now() / 1000),
    tickIncrement = 1,
    tickInterval = 1000,
  }: ClockOptions = {}) {
    this.isRunning = false;
    this.callbacks = [];
    this.tickIncrement = tickIncrement;
    this.tickInterval = tickInterval;
    this.startingTimestamp = startingTimestamp;
    this._timestamp = startingTimestamp;
  }
  /**
   * Starts the clock.
   */
  start() {
    if (this.isRunning) throw new Error("Clock is already running");
    this.isRunning = true;
    this.timer = setInterval(this.tick.bind(this), this.tickInterval);
  }
  /**
   * Stops the clock.
   */
  stop() {
    this.isRunning = false;
    clearInterval(this.timer);
  }
  /**
   * Adds a function to the list of functions to be called.
   * @param callback The function to be called.
   */
  addFunction(callback: TickCallback) {
    this.callbacks.push(callback);
  }
  /**
   * Removes a function from the list of functions to be called.
   * @param callback The function to be removed.
   */
  removeFunction(callback: TickCallback) {
    const idx = this.callbacks.indexOf(callback);
    if (idx !== -1) this.callbacks.splice(idx, 1);
  }
  reset() {
    this.callbacks = [];
  }

  /**
   * Simulates a second.
   * @returns The time of the clock.
   */
  tick() {
    if (!this.isRunning) return;
    for (let i = 0; i < this.callbacks.length; i++) {
      this.callbacks[i](this, this._timestamp);
    }
    this._timestamp += this.tickIncrement;
  }

  get timestamp() {
    return this._timestamp;
  }

  get season() {
    const moth = new Date(this._timestamp * 1000).getUTCMonth();
    if (moth >= 3 && moth <= 5) return Season.Spring;
    if (moth >= 6 && moth <= 8) return Season.Summer;
    if (moth >= 9 && moth <= 11) return Season.Autumn;
    return Season.Winter;
  }

  get month() {
    return new Date(this._timestamp * 1000).getUTCMonth();
  }

  get day() {
    return new Date(this._timestamp * 1000).getUTCDate();
  }

  get hour() {
    return new Date(this._timestamp * 1000).getUTCHours();
  }

  get minute() {
    return new Date(this._timestamp * 1000).getUTCMinutes();
  }

  get second() {
    return new Date(this._timestamp * 1000).getUTCSeconds();
  }

  get timestampString() {
    return new Date(this._timestamp * 1000).toLocaleTimeString();
  }

  get tickIntervalsInOneHour() {
    return Math.floor(3600 / this.tickIncrement) + 1;
  }
}
