export type SettingsForm = HTMLFormElement & {
  rpcUrl: HTMLInputElement;
  sk: HTMLInputElement;
  seed: HTMLInputElement;
  numberOfDERs: HTMLInputElement;
  contractAddress: HTMLInputElement;
  season: HTMLInputElement;
  tickInterval: HTMLInputElement;
  hourIncrement: HTMLInputElement;
  initialFunds: HTMLInputElement;
};

export type AgreementLogRow = {
  blockNumber: number;
  address: string;
  value: string;
  valuePrice: string;
  flexibility: string;
  flexibilityPrice: string;
};

export type AgreementEventType = "register" | "revise" | "cancel";
