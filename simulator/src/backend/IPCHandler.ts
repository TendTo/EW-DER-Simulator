import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { getLogger, Logger } from "log4js";
import { AgreementStructFrontend, BlockchainOptions, ClockOptions } from "../module";
import Aggregator from "./Aggregator";
import Clock from "./clock";
import { ToastType } from "../frontend/types";

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
  }

  static sendToast(message: string, type?: ToastType, duration?: number) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("toast", message, type, duration);
  }

  static onNewAggregatedReading(reading: number, isoString: string) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("newAggregatedReading", reading, isoString);
  }

  static onNewReading(address: string, reading: number, isoString: string) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("newReading", address, reading, isoString);
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

  static onRegisterAgreementEvent(
    prosumer: string,
    agreement: AgreementStructFrontend,
    blockNumber: number
  ) {
    this.instance.window.webContents.send(
      "registerAgreementEvent",
      prosumer,
      agreement,
      blockNumber
    );
  }

  static onCancelAgreementEvent(
    prosumer: string,
    agreement: AgreementStructFrontend,
    blockNumber: number
  ) {
    this.instance.window.webContents.send("cancelAgreementEvent", prosumer, agreement, blockNumber);
  }
  static onReviseAgreementEvent(
    prosumer: string,
    oldAgreement: AgreementStructFrontend,
    newAgreement: AgreementStructFrontend,
    blockNumber: number
  ) {
    this.instance.window.webContents.send(
      "reviseAgreementEvent",
      prosumer,
      oldAgreement,
      newAgreement,
      blockNumber
    );
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
      this.aggregator = new Aggregator(blockchainOptions, new Clock(clockOptions));
    } catch (error) {
      this.logger.error(error);
      IPCHandler.onStopLoading();
      return;
    }
    this.aggregator
      .setupSimulation(initialFunds)
      .then(() => {
        this.aggregator.startSimulation();
      })
      .catch((err) => {
        this.logger.error(err);
      })
      .finally(() => IPCHandler.onStopLoading());
  };

  stopSimulation = (_: IpcMainEvent) => {
    this.aggregator.stopSimulation();
    delete this.aggregator;
  };
}
