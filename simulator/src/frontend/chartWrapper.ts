import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
} from "chart.js";
import * as chartAnnotations from "chartjs-plugin-annotation";
import { ChartOptions, ChartSetup } from "./types";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  chartAnnotations
);

export default class ChartWrapper {
  private chart: Chart;
  private counter = 0;
  private maxDataPoints: number;
  private isFixed: boolean;

  private set data(newData: number[]) {
    this.chart.data.datasets[0].data = newData;
  }

  private get data(): number[] {
    return this.chart.data.datasets[0].data as number[];
  }

  private set labels(newLabels: (number | string)[]) {
    this.chart.data.labels = newLabels;
  }

  private get labels(): (number | string)[] {
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

  private get baseline() {
    return this.chart.options.plugins.annotation.annotations["baseline"];
  }

  private set maxY(y: number) {
    this.chart.options.scales.y.max = y;
  }

  private set minY(y: number) {
    this.chart.options.scales.y.min = y;
  }

  private set baseline(newValue: number) {
    this.chart.options.plugins.annotation.annotations["baseline"].yMin = newValue;
    this.chart.options.plugins.annotation.annotations["baseline"].yMax = newValue;
  }

  private set verticalLines(points: [number, number, number]) {
    const annotations = this.chart.options.plugins.annotation.annotations;
    annotations["startFlexibility"].xMax = points[0];
    annotations["startFlexibility"].xMin = points[0];
    annotations["endFlexibility"].xMax = points[1];
    annotations["endFlexibility"].xMin = points[1];
    annotations["restoreValue"].xMax = points[2];
    annotations["restoreValue"].xMin = points[2];
  }

  private set flexibilityBaseline(flexibilityBaseline: number) {
    this.chart.options.plugins.annotation.annotations["flexibilityBaseline"] = flexibilityBaseline
      ? {
          type: "line",
          yMin: flexibilityBaseline,
          yMax: flexibilityBaseline,
          borderDash: [5, 5],
          borderColor: "red",
        }
      : undefined;
  }

  constructor({ canvasId = "chart", maxDataPoints = 0, fixed = true }: ChartOptions = {}) {
    this.maxDataPoints = maxDataPoints;
    this.isFixed = fixed;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: fixed ? [...Array(maxDataPoints).keys()].map((i) => i.toString()) : [],
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
        animation: false,
        responsive: false,
        elements: {
          point: {
            radius: 0,
          },
        },
        scales: {
          y: {
            suggestedMin: 0,
            suggestedMax: 0,
          },
          x: {
            suggestedMin: 0,
            suggestedMax: maxDataPoints,
          },
        },
        plugins: {
          ...(fixed && {
            annotation: {
              annotations: {
                baseline: {
                  type: "line",
                  yMin: 0,
                  yMax: 0,
                  borderDash: [5, 5],
                },
                startFlexibility: {
                  type: "line",
                  xMax: Math.floor(maxDataPoints / 4),
                  xMin: Math.floor(maxDataPoints / 4),
                  borderDash: [5, 5],
                },
                endFlexibility: {
                  type: "line",
                  xMax: Math.floor(maxDataPoints / 2),
                  xMin: Math.floor(maxDataPoints / 2),
                  borderDash: [5, 5],
                },
                restoreValue: {
                  type: "line",
                  xMax: Math.floor((maxDataPoints * 3) / 4),
                  xMin: Math.floor((maxDataPoints * 3) / 4),
                  borderDash: [5, 5],
                },
              },
            },
          }),
          title: {
            display: true,
            text: "",
          },
        },
      },
    });
  }

  public setup({ baseline, currentTimestamp, nPoints, flexibilityBaseline, zoom }: ChartSetup) {
    this.baseline = baseline;
    this.flexibilityBaseline = flexibilityBaseline;
    this.labels = [];
    if (zoom) {
      const offset = (flexibilityBaseline - baseline) / 2;
      this.maxY = flexibilityBaseline + offset;
      this.minY = baseline - offset;
    } else {
      this.maxY = baseline * 2;
      this.minY = 0;
    }

    const currentMs = currentTimestamp * 1000;
    const increment = 3600000 / (nPoints - 1);
    const maxDate = currentMs + 3600000 + increment;
    const verticalLines = [0, 0, 0] as [number, number, number];
    for (let d = currentMs, i = 0; d < maxDate; d += increment, i++) {
      this.labels.push(new Date(d).toLocaleTimeString());
      if (!verticalLines[0] && d >= currentMs + 900000) verticalLines[0] = i;
      if (!verticalLines[1] && d >= currentMs + 1800000) verticalLines[1] = i;
      if (!verticalLines[2] && d >= currentMs + 2700000) verticalLines[2] = i;
    }
    this.verticalLines = verticalLines;
    this.chart.update();
  }

  public setBaseline(baseline: number) {
    this.baseline = baseline;
    this.maxY = baseline * 2;
    this.chart.update();
  }

  public setStart(startTimestamp: number) {
    this.labels = this.labels.map((_, i) =>
      new Date((startTimestamp + i) * 1000).toLocaleTimeString()
    );
    this.chart.update();
  }

  public setData(data: number[], labels?: (string | number)[]) {
    if (!this.isFixed) this.labels = data.map((_, i) => (labels ? labels[i] : i));
    this.data = data;
    this.chart.update();
  }

  public shiftData(newData: number, newLabel?: string | number) {
    if (!this.isFixed && this.data.length >= this.maxDataPoints) {
      this.labels.shift();
      this.data.shift();
    }

    if (!this.isFixed) this.labels.push(newLabel ?? this.counter);
    this.data.push(newData);
    this.counter++;
    this.chart.update();
  }

  public shiftManyData(newData: number[], newLabels?: (string | number)[]) {
    for (let i = 0; i < newData.length - 1; i++) {
      if (!this.isFixed && this.data.length >= this.maxDataPoints) {
        this.labels.shift();
        this.data.shift();
      }
      if (!this.isFixed) this.labels.push(newLabels ? newLabels[i] : this.counter);
      this.data.push(newData[i]);
      this.counter++;
    }
    this.chart.update();
  }

  public reset(update: boolean = true) {
    if (!this.isFixed) this.labels = [];
    this.data = [];
    this.counter = 0;
    if (update) this.chart.update();
  }
}
