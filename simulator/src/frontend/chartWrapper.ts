import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
} from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Title);

export default class ChartWrapper {
  private chart: Chart;
  private counter = 0;

  public set data(newData: number[]) {
    this.chart.data.datasets[0].data = newData;
  }

  public get data(): number[] {
    return this.chart.data.datasets[0].data as number[];
  }

  public set labels(newLabels: (number | string)[]) {
    this.chart.data.labels = newLabels;
  }

  public get labels(): (number | string)[] {
    return this.chart.data.labels as (number | string)[];
  }

  public get title(): string {
    return typeof this.chart.options.plugins.title.text === "string"
      ? this.chart.options.plugins.title.text
      : "";
  }

  public set title(title: string) {
    this.chart.options.plugins.title.text = title;
  }

  constructor(canvasId: string = "chart", private maxDataPoints: number = 50) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: [] as string[],
        datasets: [
          {
            label: "Aggregated readings",
            data: [] as number[],
            fill: false,
            borderColor: "rgb(75, 192, 192)",
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: "",
          },
        },
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
