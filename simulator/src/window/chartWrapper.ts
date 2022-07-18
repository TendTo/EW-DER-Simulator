import type { Chart } from "chart.js";

export default class ChartWrapper {
  private chart: Chart<"line", number[], number>;
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
