import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { getLogger, Logger } from "log4js";
import {
  CancelAgreementEvent,
  RegisterAgreementEvent,
  ReviseAgreementEvent,
} from "src/typechain-types/AggregatorContract";
import { AgreementStructFrontend, BlockchainOptions, ClockOptions } from "../module";
import Aggregator from "./Aggregator";
import Clock from "./clock";

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

  static onNewAggregatedReading(reading: number, hour: number) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("newAggregatedReading", reading, hour);
  }

  static onNewReading(address: string, reading: number, hour: number) {
    if (this.instance.window === null) throw new Error("Window is null");
    this.instance.window.webContents.send("newReading", address, reading);
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
    IPCHandler.onStartLoading();
    this.aggregator = new Aggregator(blockchainOptions, new Clock(clockOptions));
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
