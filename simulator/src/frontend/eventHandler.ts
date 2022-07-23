import ButtonWrapper from "./buttonsWrapper";
import ChartWrapper from "./chartWrapper";
import TableManager from "./tableManager";
import { SettingsForm } from "./types";

export default class EventHandler {
  private readonly chart: ChartWrapper;
  private readonly tableManager: TableManager;
  private readonly buttonsWrapper: ButtonWrapper;

  constructor() {
    this.chart = new ChartWrapper();
    this.tableManager = new TableManager();
    this.buttonsWrapper = new ButtonWrapper();
    this.addHandlers();
  }

  private addHandlers() {
    this.onStartLoading();
    this.onStopLoading();
    this.onAddAgreementLog();
    this.onStartSimulation();
    this.onStopSimulation();
    this.onNewAggregatedReading();
    this.onAggregatorBalance();
  }

  private onAddAgreementLog() {
    const button = document.getElementById("test") as HTMLButtonElement;
    button.addEventListener("click", () => {
      this.tableManager.addAgreementLogRow({
        address: "0x123",
        value: Math.random().toFixed(1),
        valuePrice: "0.2",
        flexibility: "0.3",
        flexibilityPrice: "0.4",
      });
    });
  }

  private onStartSimulation() {
    const form = document.getElementById("settings") as SettingsForm;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // TODO: REMOVE THIS DEFAULT VALUE
      const blockchainData = {
        rpcUrl: form.rpcUrl.value || "http://134.209.139.226:8545",
        seed: form.seed.value || form.sk.value,
        sk: form.sk.value,
        numberOfDERs: parseInt(form.numberOfDERs.value) || 1,
        contractAddress: form.contractAddress.value || "0x2594f79bd3c865CEb109CF2df97F5ee6E490A43D",
      };
      const clockData = {
        season: parseInt(form.season.value) || 0,
        hourIncrement: parseInt(form.hourIncrement.value) || 1,
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
      this.chart.reset();
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
    window.electronAPI.on.startLoading((_) => {
      console.log("Loading stopped");
      this.buttonsWrapper.loading(false);
    });
  }
}
