import { EnergySource } from "src/backend/constants";

export type SettingsForm = HTMLFormElement & {
  rpcUrl: HTMLInputElement;
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

export type FlexibilityForm = HTMLFormElement & {
  flexibilityStart: HTMLInputElement;
  flexibilityStop: HTMLInputElement;
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
  start: string;
  prosumer: string;
  flexibility: string;
  blockNumber: number;
  stop?: string;
  className: "positive-bg" | "neutral-bg" | "negative-bg";
};

export type AgreementEventType = "register" | "revise" | "cancel";

export type ToastType = "success" | "error" | "info" | "warning";
