import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { getLogger, Logger } from "log4js";
import {
  BlockchainOptions,
  ClockOptions,
  DerVariationOptions,
  FlexibilityOptions,
} from "../module";
import Aggregator from "./Aggregator";
import Clock from "./clock";
import { AgreementLogRow, ToastType, FlexibilityLogRow, ChartSetup } from "../frontend/types";

export default class IPCHandler {
  private static instance: IPCHandler;
  private readonly logger: Logger;
  private aggregator: Aggregator;

  private constructor(private window: BrowserWindow) {
    this.logger = getLogger("default");
  }

  static init(window: BrowserWindow) {
    this.instance = new IPCHandler(window);
  }

  static registerHandlers() {
    ipcMain.on("startSimulation", this.instance.startSimulation);
    ipcMain.on("stopSimulation", this.instance.stopSimulation);
    ipcMain.on("derVariation", this.instance.derVariation);
    ipcMain.on("flexibilityRequest", this.instance.flexibilityRequest);
  }

  static sendToast(message: string, type?: ToastType, duration?: number) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("toast", message, type, duration);
  }

  static onNewAggregatedReading(reading: number, isoString: string, options?: ChartSetup) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("newAggregatedReading", reading, isoString, options);
  }

  static onNewReading(address: string, reading: number, isoString: string, options?: ChartSetup) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("newReading", address, reading, isoString, options);
  }

  static onAggregatorBalance(address: string, balance: string) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("aggregatorBalance", address, balance);
  }

  static onStartLoading() {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("startLoading");
  }

  static onStopLoading() {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("stopLoading");
  }

  static onAgreementEvent(agreementLogRow: AgreementLogRow) {
    this.instance.window.webContents.send("agreementEvent", agreementLogRow);
  }

  static onFlexibilityEvent(flexibilityLogRow: FlexibilityLogRow) {
    this.instance.window.webContents.send("flexibilityEvent", flexibilityLogRow);
  }

  static onSetBaseline(baseline: number) {
    this.instance.window.webContents.send("setBaseline", baseline);
  }

  startSimulation = (
    _: IpcMainEvent,
    blockchainOptions: BlockchainOptions,
    clockOptions: ClockOptions,
    initialFunds: boolean
  ) => {
    this.logger.debug(`Starting simulation ${{ blockchainOptions, clockOptions }}`);
    IPCHandler.onStartLoading();
    try {
      this.aggregator = new Aggregator(blockchainOptions, new Clock(clockOptions), initialFunds);
    } catch (error) {
      this.logger.error(error);
      IPCHandler.onStopLoading();
      return;
    }
    this.aggregator
      .setupSimulation()
      .then(() => this.aggregator.startSimulation())
      .catch((err) => this.logger.error(err))
      .finally(() => IPCHandler.onStopLoading());
  };

  stopSimulation = (_: IpcMainEvent) => {
    this.aggregator.stopSimulation();
    delete this.aggregator;
  };

  derVariation = (_: IpcMainEvent, derVariationData: DerVariationOptions) => {
    IPCHandler.sendToast(
      derVariationData.derVariation > 0
        ? `Creating ${derVariationData.derVariation} new DERs of type ${derVariationData.derType}`
        : `Removing at most ${derVariationData.derVariation} DERs of type ${derVariationData.derType}`,
      "info"
    );
    this.aggregator.variateIoTs(derVariationData);
  };

  flexibilityRequest = (_: IpcMainEvent, flexibilityData: FlexibilityOptions) => {
    IPCHandler.onStartLoading();
    IPCHandler.sendToast("Sending the flexibility request", "info");
    this.aggregator.requestFlexibility(flexibilityData).then(() => IPCHandler.onStopLoading());
  };
}
