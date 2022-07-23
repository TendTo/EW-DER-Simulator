import type { IpcRendererEvent } from "electron";
import type { Chart } from "chart.js";
import { Season } from "./backend/constants";

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

export type BlockchainOptions = {
  rpcUrl: string;
  contractAddress: string;
  seed: string;
  sk: string;
  numberOfDERs: number;
};

export type ClockOptions = {
  season?: Season;
  tickInterval?: number;
  hour?: number;
  day?: number;
  hourIncrement?: number;
};

export type ElectronAPI = GetApiType<
  {
    stopSimulation: () => void;
    startSimulation: (
      data: BlockchainOptions,
      clockOptions: ClockOptions,
      initialFunds: boolean
    ) => void;
  },
  {},
  {
    aggregatorBalance: (address: string, balance: string) => Promise<void>;
    newReading: (address: string, reading: number) => Promise<void>;
    newAggregatedReading: (reading: number, hour: number) => Promise<void>;
  }
>;

declare global {
  interface Window {
    Chart: typeof Chart;
    electronAPI: ElectronAPI;
  }
}
