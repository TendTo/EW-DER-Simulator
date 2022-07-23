import { ClockOptions } from "../module";
import { Season } from "./constants";

type TickCallback = (month: number, day: number, hour: number) => void;

/**
 * Class that simulates a clock.
 * Each second, all the functions in the list are called,
 * passing the time as argument.
 */
export default class Clock {
  private callbacks: Function[];
  private isRunning: boolean;
  private timer: NodeJS.Timer;
  private season: Season;
  private day: number;
  private hour: number;
  private hourIncrement: number;
  private tickInterval: number;
  /**
   * Creates a new clock.
   */
  constructor(
    {
      season = Season.Winter,
      day = 0,
      hour = 0,
      hourIncrement = 1,
      tickInterval = 1000,
    }: ClockOptions = {
      season: Season.Winter,
      day: 0,
      hour: 0,
      hourIncrement: 1,
      tickInterval: 1000,
    }
  ) {
    this.isRunning = false;
    this.callbacks = [];
    this.season = season;
    this.day = day;
    this.hour = hour;
    this.hourIncrement = hourIncrement;
    this.tickInterval = tickInterval;
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
    this.callbacks.splice(this.callbacks.indexOf(callback), 1);
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
      this.callbacks[i](this.season, this.day, this.hour);
    }
    this.incrementTime();
  }

  private incrementTime() {
    this.hour += this.hourIncrement;
    while (this.hour >= 24) {
      this.hour -= 24;
      this.day++;
    }
    while (this.day >= 91) {
      this.day -= 91;
      this.season++;
    }
    while (this.season >= Season.Autumn) {
      this.season -= 4;
    }
  }
}
