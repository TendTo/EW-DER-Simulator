import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { SimulationSetup } from "src/module";
import Aggregator from "./Aggregator";

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

  static onNewReading(reading: number) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("newReading", reading);
  }

  startSimulation = (event: IpcMainEvent, data: SimulationSetup) => {
    this.aggregator = new Aggregator(data.seed, data.sk, data.numberOfDERs);
    this.aggregator.startSimulation();
  };

  stopSimulation = (event: IpcMainEvent) => {
    this.aggregator.stopSimulation();
  };
}
