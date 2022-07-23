type SettingsForm = HTMLFormElement & {
  rpcUrl: HTMLInputElement;
  sk: HTMLInputElement;
  seed: HTMLInputElement;
  numberOfDERs: HTMLInputElement;
  contractAddress: HTMLInputElement;
  season: HTMLInputElement;
  tickInterval: HTMLInputElement;
  hourIncrement: HTMLInputElement;
  initialFunds: HTMLInputElement;
};

class ChartWrapper {
  private chart: any;
  private counter = 0;

  public set data(newData: number[]) {
    this.chart.data.datasets[0].data = newData;
  }

  public get data(): number[] {
    return this.chart.data.datasets[0].data;
  }

  public set labels(newLabels: (number | string)[]) {
    this.chart.data.labels = newLabels;
  }

  public get labels(): (number | string)[] {
    return this.chart.data.labels;
  }

  constructor(canvasId: string = "chart", private maxDataPoints: number = 50) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.chart = new window.Chart(canvas, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Aggregated readings",
            data: [],
            fill: false,
            borderColor: "rgb(75, 192, 192)",
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: false,
      },
    });
  }

  public setData(data: number[], labels?: (string | number)[]) {
    this.data = data;
    this.labels = data.map((_, i) => (labels ? labels[i] : i));
    this.chart.update();
  }

  public shiftData(newData: number, newLabel?: string | number) {
    if (this.data.length >= this.maxDataPoints) {
      this.data.shift();
      this.labels.shift();
    }

    this.labels.push(newLabel ?? this.counter);
    this.data.push(newData);
    this.counter++;
    this.chart.update();
  }

  public shiftManyData(newData: number[], newLabels?: (string | number)[]) {
    for (let i = 0; i < newData.length - 1; i++) {
      if (this.data.length >= this.maxDataPoints) {
        this.data.shift();
        this.labels.shift();
      }
      this.labels.push(newLabels ? newLabels[i] : this.counter);
      this.data.push(newData[i]);
      this.counter++;
    }
    this.chart.update();
  }

  public reset() {
    this.labels = [];
    this.data = [];
    this.counter = 0;
    this.chart.update();
  }
}

class Renderer {
  private chart: ChartWrapper;
  constructor() {
    this.chart = new ChartWrapper();
    this.addHandlers();
  }

  private addHandlers() {
    this.startSimulation();
    this.stopSimulation();
    this.onNewAggregatedReading();
    this.onAggregatorBalance();
  }

  private startSimulation() {
    const form = document.getElementById("settings") as SettingsForm;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // TODO: REMOVE THIS DEFAULT VALUE
      const blockchainData = {
        rpcUrl: form.rpcUrl.value || "http://134.209.139.226:8545",
        seed: form.seed.value || form.sk.value,
        sk: form.sk.value,
        numberOfDERs: parseInt(form.numberOfDERs.value) || 1,
        contractAddress:
          form.contractAddress.value ||
          "0x2594f79bd3c865CEb109CF2df97F5ee6E490A43D",
      };
      const clockData = {
        season: parseInt(form.season.value) || 0,
        hourIncrement: parseInt(form.hourIncrement.value) || 1,
        tickInterval: parseInt(form.tickInterval.value) * 1000 || 1000,
      };
      window.electronAPI.send.startSimulation(
        blockchainData,
        clockData,
        form.initialFunds.checked
      );
      console.log("Simulation started", blockchainData, clockData);
    });
  }

  private stopSimulation() {
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
      document.getElementById(
        "aggregatorInfo"
      ).innerText = `Aggregator: ${address} - ${balance} VT`;
    });
  }
}

new Renderer();
