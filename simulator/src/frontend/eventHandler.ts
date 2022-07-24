import type { SettingsForm, AgreementEventType } from "./types";
import ButtonWrapper from "./buttonsWrapper";
import ChartWrapper from "./chartWrapper";
import TableManager from "./tableManager";
import { AgreementStructFrontend, BlockchainOptions } from "../module";

export default class EventHandler {
  private readonly chart: ChartWrapper;
  private readonly tableManager: TableManager;
  private readonly buttonsWrapper: ButtonWrapper;
  private isPlaying: boolean;

  constructor() {
    this.isPlaying = false;
    this.chart = new ChartWrapper();
    this.tableManager = new TableManager();
    this.buttonsWrapper = new ButtonWrapper();
    this.addHandlers();
  }

  private addHandlers() {
    this.onStartLoading();
    this.onStopLoading();
    this.onRegisterAgreementEvent();
    this.onReviseAgreementEvent();
    this.onCancelAgreementEvent();
    this.onStartSimulation();
    this.onStopSimulation();
    this.onNewAggregatedReading();
    this.onAggregatorBalance();
  }

  private onCancelAgreementEvent() {
    window.electronAPI.on.cancelAgreementEvent((_, prosumer, agreement, blockNumber) => {
      this.addAgreementRow(blockNumber, prosumer, agreement, "cancel");
    });
  }

  private onReviseAgreementEvent() {
    window.electronAPI.on.reviseAgreementEvent(
      (_, prosumer, oldAgreement, newAgreement, blockNumber) => {
        this.addAgreementRow(blockNumber, prosumer, newAgreement, "revise");
      }
    );
  }

  private onRegisterAgreementEvent() {
    window.electronAPI.on.registerAgreementEvent((_, prosumer, agreement, blockNumber) => {
      this.addAgreementRow(blockNumber, prosumer, agreement, "register");
    });
  }

  private addAgreementRow(
    blockNumber: number,
    prosumer: string,
    { value, valuePrice, flexibility, flexibilityPrice }: AgreementStructFrontend,
    eventType: AgreementEventType
  ) {
    this.tableManager.addAgreementLogRow(
      {
        blockNumber,
        address: prosumer,
        value: value,
        valuePrice: valuePrice,
        flexibility: flexibility,
        flexibilityPrice: flexibilityPrice,
      },
      eventType
    );
  }

  private onStartSimulation() {
    const form = document.getElementById("settings") as SettingsForm;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.isPlaying) return;
      this.isPlaying = true;
      const blockchainData: BlockchainOptions = {
        rpcUrl: form.rpcUrl.value || "http://134.209.139.226:8545",
        seed: form.seed.value || form.sk.value,
        sk: form.sk.value,
        numberOfDERs: {
          Solar: parseInt(form.numberOfSolarDERs.value) || 1,
          Wind: parseInt(form.numberOfWindDERs.value) || 1,
        },
        contractAddress: form.contractAddress.value || "0xCE3b21daF429B705d5f8eA3d409c047641a4496B",
      };
      const clockData = {
        season: parseInt(form.season.value) || 0,
        tickIncrement: parseInt(form.tickIncrement.value) || 1,
        tickInterval: parseInt(form.tickInterval.value) * 1000 || 1000,
      };
      window.electronAPI.send.startSimulation(blockchainData, clockData, form.initialFunds.checked);
      console.log("Simulation started", blockchainData, clockData);
    });
  }

  private onStopSimulation() {
    const stopButton = document.getElementById("stop") as HTMLButtonElement;
    stopButton.addEventListener("click", () => {
      window.electronAPI.send.stopSimulation();
      this.isPlaying = false;
      this.chart.reset();
      this.tableManager.reset();
      this.buttonsWrapper.playing(false);
      console.log("Simulation stopped");
    });
  }

  private onNewAggregatedReading() {
    // Receive new aggregated reading
    window.electronAPI.on.newAggregatedReading((_, reading, hours) => {
      console.log(reading);
      const date = new Date(0, 0, 0, hours);
      this.chart.shiftData(reading, date.toISOString().substring(11, 16));
    });
  }

  private onAggregatorBalance() {
    window.electronAPI.on.aggregatorBalance((_, address, balance) => {
      this.chart.title = `Aggregator ${address}`;
    });
  }

  private onStartLoading() {
    window.electronAPI.on.startLoading((_) => {
      console.log("Loading...");
      this.buttonsWrapper.loading(true);
    });
  }

  private onStopLoading() {
    window.electronAPI.on.stopLoading((_) => {
      console.log("Loading stopped");
      this.buttonsWrapper.loading(false);
    });
  }
}
