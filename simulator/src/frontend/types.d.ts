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
};

export type FlexibilityLogRow = {
  blockNumber: number;
  address: string;
  flexibility: number;
  reward: number;
  start: number;
};

export type AgreementEventType = "register" | "revise" | "cancel";

export type ToastType = "success" | "error" | "info" | "warning";
