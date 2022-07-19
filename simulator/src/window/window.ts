class ChartWrapper {
  private chart: any;
  private counter = 0;
  private labels: number[];
  private data: number[];

  constructor(canvasId: string = "chart", private maxDataPoints: number = 100) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.labels = [];
    this.data = [];
    this.chart = new window.Chart(canvas, {
      type: "line",
      data: {
        labels: this.labels,
        datasets: [
          {
            label: "Aggregated readings",
            data: this.data,
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

  public shiftData(newData: number) {
    if (this.data.length >= this.maxDataPoints) {
      this.data.shift();
      this.labels.shift();
    }

    this.labels.push(this.counter++);
    this.data.push(newData);

    this.chart.update();
  }

  public shiftManyData(newData: number[]) {
    for (let i = 0; i < newData.length - 1; i++) {
      if (this.data.length >= this.maxDataPoints) {
        this.data.shift();
        this.labels.shift();
      }
      this.labels.push(this.counter++);
      this.data.push(newData[i]);
    }
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
    const form = document.getElementById("settings") as HTMLFormElement;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const seed = form.seed.value;
      const sk = form.sk.value;
      const numberOfDERs = parseInt(form.numberOfDERs.value) || 1;
      const data = { seed, sk, numberOfDERs };
      window.electronAPI.send.startSimulation(data);
      console.log("Simulation started", data);
    });
    window.electronAPI.on.newReading((_: any, reading: number) => {
      this.chart.shiftData(reading);
    });
  }
}

new Renderer();
