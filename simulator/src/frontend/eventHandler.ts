import ButtonWrapper from "./buttonsWrapper";
import ChartWrapper from "./chartWrapper";
import TableManager from "./tableManager";
import FromWrapper from "./formWrapper";
import ToastWrapper from "./toastWrapper";

export default class EventHandler {
  private readonly chart = new ChartWrapper();
  private readonly tableManager = new TableManager();
  private readonly buttonsWrapper = new ButtonWrapper();
  private readonly toastWrapper = new ToastWrapper();
  private readonly formWrapper = new FromWrapper(this.toastWrapper);
  private readonly activeDers = document.getElementById("activeDers");
  private isPlaying = false;
  private nActiveDers = 0;

  constructor() {
    this.addHandlers();
  }

  private addHandlers() {
    this.avoidNumberScroll();
    this.onFlexibilityRequest();
    this.onStartLoading();
    this.onStopLoading();
    this.onStartSimulation();
    this.onStopSimulation();
    this.onNewAggregatedReading();
    this.onAggregatorBalance();
    this.onToast();
    this.onFlexibilityEvent();
    this.onAgreementEvent();
    this.onSetBaseline();
    this.onPauseResumeSimulator();
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

  private onFlexibilityRequest() {
    this.formWrapper.addFlexibilityFormOnSubmit((flexibilityData) => {
      if (!this.isPlaying) return this.toastWrapper.show("Simulation not running", "error");
      window.electronAPI.send.flexibilityRequest(flexibilityData);
    });
  }

  private onStartSimulation() {
    this.formWrapper.addSettingsFormOnSubmit((blockchainData, clockData, initialFunds) => {
      if (this.isPlaying) {
        this.toastWrapper.show("Simulation already running", "error");
        return;
      }
      this.isPlaying = true;
      this.nActiveDers = 0;
      this.activeDers.innerHTML = "Current number of DERs: 0";
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
      this.activeDers.innerHTML = "";
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
    window.electronAPI.on.newAggregatedReading((_, reading, ISOString, options) => {
      if (options) {
        this.chart.setup(options);
        this.chart.reset(false);
      }
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

  private onAgreementEvent() {
    window.electronAPI.on.agreementEvent((_, agreementRow) => {
      this.tableManager.addAgreementLogRow(agreementRow);
      if (agreementRow.className === "positive-bg")
        this.activeDers.innerHTML = `Current number of DERs: ${++this.nActiveDers}`;
    });
  }

  private onSetBaseline() {
    window.electronAPI.on.setBaseline((_, baseline) => {
      this.chart.setBaseline(baseline);
    });
  }

  private onPauseResumeSimulator() {
    this.buttonsWrapper.pauseButton.addEventListener("click", () => {
      if (!this.isPlaying) {
        this.toastWrapper.show("Simulation not running", "warning");
        return;
      }
      window.electronAPI.send.pauseResumeSimulation();
    });
  }
}
