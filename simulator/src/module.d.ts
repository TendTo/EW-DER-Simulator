import type { IpcRendererEvent } from "electron";
import { WebContents } from "electron/main";
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
      listener: (event: IpcRendererEvent, ...args: Parameters<ListenFromMain[K]>) => void
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
    startLoading: () => Promise<void>;
    stopLoading: () => Promise<void>;
    aggregatorBalance: (address: string, balance: string) => Promise<void>;
    newReading: (address: string, reading: number) => Promise<void>;
    newAggregatedReading: (reading: number, hour: number) => Promise<void>;
  }
>;

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

type GetFirstArg<F> = F extends (x: infer F, ...args: any) => any ? F : never;
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => any ? P : never;
type ApiWebContents = Omit<WebContents, "send"> & {
  send<T extends keyof ElectronAPI["on"]>(
    channel: T,
    ...args: OmitFirstArg<GetFirstArg<ElectronAPI["on"][T]>>
  ): Promise<ReturnType<ElectronAPI["on"][T]>>;
};

declare module "electron" {
  interface BrowserWindow {
    webContents: ApiWebContents;
  }
  namespace Electron {
    interface IpcMain {
      on<T extends keyof ElectronAPI["send"]>(
        channel: T,
        listener: (
          event: IpcRendererEvent,
          ...args: ElectronAPI["send"][T] extends (...args: infer P) => any ? P : never
        ) => void
      ): IpcRenderer;
    }
  }
}
