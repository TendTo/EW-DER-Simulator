import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { BlockchainOptions, ClockOptions } from "../module";
import Aggregator from "./Aggregator";
import Clock from "./clock";

export default class IPCHandler {
  private static instance: IPCHandler;
  private aggregator: Aggregator;

  private constructor(private window: BrowserWindow) {}

  static init(window: BrowserWindow) {
    this.instance = new IPCHandler(window);
  }

  static registerHandlers() {
    ipcMain.on("startSimulation", this.instance.startSimulation);
    ipcMain.on("stopSimulation", this.instance.stopSimulation);
  }

  static onNewAggregatedReading(reading: number, hour: number) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send(
      "newAggregatedReading",
      reading,
      hour
    );
  }

  static onNewReading(address: string, reading: number, hour: number) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("newReading", address, reading);
  }

  static onAggregatorBalance(address: string, balance: string) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send(
      "aggregatorBalance",
      address,
      balance
    );
  }

  startSimulation = (
    _: IpcMainEvent,
    blockchainOptions: BlockchainOptions,
    clockOptions: ClockOptions,
    initialFunds: boolean
  ) => {
    this.aggregator = new Aggregator(
      blockchainOptions,
      new Clock(clockOptions)
    );
    this.aggregator.setupSimulation(initialFunds).then(() => {
      this.aggregator.startSimulation();
    });
  };

  stopSimulation = (event: IpcMainEvent) => {
    this.aggregator.stopSimulation();
  };
}
