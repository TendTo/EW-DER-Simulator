import type { IpcRendererEvent } from "electron";
import type { Chart } from "chart.js";

export type GetApiType<
  SendFromRenderer extends Record<string, (...args: any[]) => any>,
  InvokeFromRenderer extends Record<string, (...args: any[]) => Promise<any>>,
  ListenFromMain extends Record<string, (...args: any[]) => Promise<any>>
> = {
  send: SendFromRenderer;
  invoke: InvokeFromRenderer;
  on: {
    [K in keyof ListenFromMain]: (
      listener: (
        event: IpcRendererEvent,
        ...args: Parameters<ListenFromMain[K]>
      ) => void
    ) => void;
  };
};

export type SimulationSetup = {
  seed: string;
  sk: string;
  numberOfDERs: number;
};

export type ElectronAPI = GetApiType<
  {
    stopSimulation: () => void;
    startSimulation: (data: SimulationSetup) => void;
  },
  {},
  {
    newReading: (reading: number) => Promise<void>;
  }
>;

declare global {
  interface Window {
    Chart: typeof Chart;
    electronAPI: ElectronAPI;
  }
}
