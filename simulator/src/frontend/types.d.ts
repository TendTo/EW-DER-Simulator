import { EnergySource } from "src/backend/constants";

export type SettingsForm = HTMLFormElement & {
  aggRpcUrl: HTMLInputElement;
  derRpcUrl: HTMLInputElement;
  sk: HTMLInputElement;
  seed: HTMLInputElement;
  numberOfSolarDERs: HTMLInputElement;
  numberOfWindDERs: HTMLInputElement;
  contractAddress: HTMLInputElement;
  startTimestamp: HTMLInputElement;
  tickInterval: HTMLInputElement;
  tickIncrement: HTMLInputElement;
  initialFunds: HTMLInputElement;
};

export type ChartSetup = {
  baseline: number;
  flexibilityBaseline?: number;
  currentTimestamp: number;
  nPoints: number;
  zoom?: boolean;
};

export type ChartOptions = {
  canvasId?: string;
  maxDataPoints?: number;
  fixed?: boolean;
};

export type FlexibilityForm = HTMLFormElement & {
  flexibilityValue: HTMLInputElement;
};

export type DerForm = HTMLFormElement & {
  derType: HTMLInputElement;
  derVariation: HTMLInputElement;
};

export type AgreementLogRow = {
  blockNumber: number;
  address: string;
  value: string;
  valuePrice: string;
  flexibility: string;
  flexibilityPrice: string;
  energySource: EnergySource;
  className: "positive-bg" | "neutral-bg" | "negative-bg";
};

export type FlexibilityLogRow = {
  id: number;
  nIoT: number;
  successStart: number;
  successReset: number;
  successFlexibility: number;
  percentageDIfference: number;
  success: boolean;
};

export type AgreementEventType = "register" | "revise" | "cancel";

export type ToastType = "success" | "error" | "info" | "warning";
