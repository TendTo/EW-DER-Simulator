import type { AgreementEventType } from "./types";
import ButtonWrapper from "./buttonsWrapper";
import ChartWrapper from "./chartWrapper";
import TableManager from "./tableManager";
import { AgreementStructFrontend } from "../module";
import FromWrapper from "./formWrapper";
import ToastWrapper from "./toastWrapper";

export default class EventHandler {
  private readonly chart: ChartWrapper;
  private readonly tableManager: TableManager;
  private readonly buttonsWrapper: ButtonWrapper;
  private readonly formWrapper: FromWrapper;
  private readonly toastWrapper: ToastWrapper;
  private isPlaying: boolean;

  constructor() {
    this.isPlaying = false;
    this.chart = new ChartWrapper();
    this.tableManager = new TableManager();
    this.buttonsWrapper = new ButtonWrapper();
    this.formWrapper = new FromWrapper();
    this.toastWrapper = new ToastWrapper();
    this.addHandlers();
  }

  private addHandlers() {
    this.avoidNumberScroll();
    this.onDerVariation();
    this.onFlexibilityRequest();
    this.onStartLoading();
    this.onStopLoading();
    this.onRegisterAgreementEvent();
    this.onReviseAgreementEvent();
    this.onCancelAgreementEvent();
    this.onStartSimulation();
    this.onStopSimulation();
    this.onNewAggregatedReading();
    this.onAggregatorBalance();
    this.onToast();
    this.onFlexibilityEvent();
  }

  private onToast() {
    window.electronAPI.on.toast((_, message, type, duration) => {
      this.toastWrapper.show(message, type, duration);
    });
  }

  private avoidNumberScroll() {
    document.addEventListener("wheel", (event) => {
      if (document?.activeElement?.matches("[type='number']"))
        if (event.target) (event.target as HTMLInputElement).blur();
    });
  }

  private onDerVariation() {
    this.formWrapper.addDerFormOnSubmit((derData) => {
      window.electronAPI.send.derVariation(derData);
    });
  }

  private onFlexibilityRequest() {
    this.formWrapper.addFlexibilityFormOnSubmit((flexibilityData) => {
      if (flexibilityData.flexibilityStart > flexibilityData.flexibilityStop) {
        this.toastWrapper.show("Flexibility start must be before flexibility stop", "error");
        return;
      }
      window.electronAPI.send.flexibilityRequest(flexibilityData);
    });
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
    this.formWrapper.addSettingsFormOnSubmit((blockchainData, clockData, initialFunds) => {
      if (this.isPlaying) {
        this.toastWrapper.show("Simulation already running", "error");
        return;
      }
      this.isPlaying = true;
      window.electronAPI.send.startSimulation(blockchainData, clockData, initialFunds);
      console.log("Simulation started", blockchainData, clockData, initialFunds);
    });
  }

  private onStopSimulation() {
    const stopButton = document.getElementById("stop") as HTMLButtonElement;
    stopButton.addEventListener("click", () => {
      if (!this.isPlaying) {
        this.toastWrapper.show("Simulation not running", "warning");
        return;
      }
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
    window.electronAPI.on.newAggregatedReading((_, reading, ISOString) => {
      this.chart.shiftData(reading, ISOString);
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

  private onFlexibilityEvent() {
    window.electronAPI.on.flexibilityEvent((_, flexibilityLogRow) =>
      this.tableManager.addFlexibilityLogRow(flexibilityLogRow)
    );
  }
}
