import type { IpcRendererEvent } from "electron";
import ChartWrapper from "./chartWrapper.js";

export default class Renderer {
  private chart: ChartWrapper;
  constructor() {
    this.chart = new ChartWrapper();
    this.addHandlers();
  }

  private addHandlers() {
    window.electronAPI.on.newReading((_: IpcRendererEvent, reading: number) => {
      this.chart.shiftData(reading);
    });
  }
}
