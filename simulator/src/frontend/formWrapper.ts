import { EnergySource } from "src/backend/constants";
import {
  BlockchainOptions,
  ClockOptions,
  DerVariationOptions,
  FlexibilityOptions,
} from "../module";
import { DerForm, FlexibilityForm, SettingsForm } from "./types";

export default class FromWrapper {
  private settingsForm: SettingsForm;
  private flexibilityForm: FlexibilityForm;
  private derForm: DerForm;

  constructor() {
    this.settingsForm = document.getElementById("settings") as SettingsForm;
    this.flexibilityForm = document.getElementById("flexibilityForm") as FlexibilityForm;
    this.derForm = document.getElementById("derForm") as DerForm;
  }

  public addSettingsFormOnSubmit(
    callback: (
      blockchainData: BlockchainOptions,
      clockData: ClockOptions,
      initialFunds: boolean
    ) => void
  ) {
    this.settingsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      callback(this.blockchainData, this.clockData, this.settingsForm.initialFunds.checked);
    });
  }

  public addFlexibilityFormOnSubmit(callback: (flexibilityData: FlexibilityOptions) => void) {
    this.flexibilityForm.addEventListener("submit", (e) => {
      e.preventDefault();
      callback(this.flexibilityData);
    });
  }

  public addDerFormOnSubmit(callback: (derVariationData: DerVariationOptions) => void) {
    this.derForm.addEventListener("submit", (e) => {
      e.preventDefault();
      callback(this.derVariationData);
    });
  }

  get blockchainData(): BlockchainOptions {
    const nSolar = parseInt(this.settingsForm.numberOfSolarDERs.value);
    const nWind = parseInt(this.settingsForm.numberOfWindDERs.value);
    return {
      rpcUrl: this.settingsForm.rpcUrl.value || "http://134.209.139.226:8545",
      seed: this.settingsForm.seed.value || this.settingsForm.sk.value,
      sk: this.settingsForm.sk.value,
      numberOfDERs: {
        Solar: isNaN(nSolar) ? 1 : nSolar,
        Wind: isNaN(nWind) ? 1 : nWind,
      },
      contractAddress:
        this.settingsForm.contractAddress.value || "0xCE3b21daF429B705d5f8eA3d409c047641a4496B",
    };
  }

  get clockData(): ClockOptions {
    const startingTimestamp =
      new Date(`${this.settingsForm.startTimestamp.value}Z`).getTime() / 1000;
    return {
      ...(startingTimestamp && { startingTimestamp }),
      tickIncrement: parseInt(this.settingsForm.tickIncrement.value) || 1,
      tickInterval: parseInt(this.settingsForm.tickInterval.value) * 1000 || 1000,
    };
  }

  get flexibilityData(): FlexibilityOptions {
    const flexibilityStart =
      new Date(`${this.flexibilityForm.flexibilityStart.value}Z`).getTime() / 1000;
    const flexibilityStop =
      new Date(`${this.flexibilityForm.flexibilityStop.value}Z`).getTime() / 1000;
    return {
      ...(flexibilityStart && { flexibilityStart }),
      ...(flexibilityStop && { flexibilityStop }),
      flexibilityValue: parseInt(this.flexibilityForm.flexibilityValue.value),
    };
  }

  get derVariationData(): DerVariationOptions {
    return {
      derType: this.derForm.derType.value as keyof typeof EnergySource,
      derVariation: parseInt(this.derForm.derVariation.value) || 0,
    };
  }
}