import type { IpcRenderer, IpcRendererEvent } from "electron";
import type { WebContents } from "electron/main";
import type Clock from "./backend/clock";
import type { EnergySource, Season } from "./backend/constants";
import { AgreementLogRow, ChartSetup, FlexibilityLogRow, ToastType } from "./frontend/types";

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

export type NumberOfDERs = Partial<Record<keyof typeof EnergySource, number>>;

export type BlockchainOptions = {
  rpcUrl: string;
  contractAddress: string;
  seed: string;
  sk: string;
  numberOfDERs: NumberOfDERs;
};

export type ClockTickCallback = (clock: Clock, timestamp: number) => void;

export type ClockOptions = {
  startingTimestamp?: number;
  tickInterval?: number;
  tickIncrement?: number;
};

export type FlexibilityOptions = {
  flexibilityStart?: number;
  flexibilityStop?: number;
  flexibilityValue: number;
};

export type DerVariationOptions = {
  derType: keyof typeof EnergySource;
  derVariation: number;
};

export type ElectronAPI = GetApiType<
  {
    stopSimulation: () => void;
    startSimulation: (
      data: BlockchainOptions,
      clockOptions: ClockOptions,
      initialFunds: boolean
    ) => void;
    flexibilityRequest: (flexibilityData: FlexibilityOptions) => void;
    derVariation: (derVariationData: DerVariationOptions) => void;
  },
  {},
  {
    agreementEvent: (agreementRow: AgreementLogRow) => Promise<void>;
    flexibilityEvent: (flexibilityRow: FlexibilityLogRow) => Promise<void>;
    startLoading: () => Promise<void>;
    stopLoading: () => Promise<void>;
    aggregatorBalance: (address: string, balance: string) => Promise<void>;
    newReading: (
      address: string,
      reading: number,
      isoString: string,
      options?: ChartSetup
    ) => Promise<void>;
    newAggregatedReading: (
      reading: number,
      isoString: string,
      options?: ChartSetup
    ) => Promise<void>;
    toast: (message: string, type?: ToastType, duration?: number) => Promise<void>;
    setBaseline: (baseline: number) => Promise<void>;
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
}

declare namespace Electron {
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
