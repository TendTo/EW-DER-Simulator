import { EnergySource } from "src/backend/constants";
import {
  BlockchainOptions,
  ClockOptions,
  DerVariationOptions,
  FlexibilityOptions,
} from "../module";
import ToastWrapper from "./toastWrapper";
import { DerForm, FlexibilityForm, SettingsForm } from "./types";

export default class FromWrapper {
  private settingsForm = document.getElementById("settings") as SettingsForm;
  private flexibilityForm = document.getElementById("flexibilityForm") as FlexibilityForm;
  private derForm = document.getElementById("derForm") as DerForm;
  private env = window.electronAPI.env;

  constructor(private toastWrapper: ToastWrapper) {}

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

  private parseLocalDate(date: string): number {
    return date ? Math.floor(new Date(date).getTime() / 1000) : undefined;
  }

  get blockchainData(): BlockchainOptions {
    const nSolar = parseInt(this.settingsForm.numberOfSolarDERs.value);
    const nWind = parseInt(this.settingsForm.numberOfWindDERs.value);
    if (!this.env.SK && !this.settingsForm.sk.value) {
      this.toastWrapper.show("Please enter your SK", "error");
      throw Error("No private key provided");
    }
    return {
      aggRpcUrl:
        this.settingsForm.aggRpcUrl.value || this.env.AGG_RPC_URL || "http://134.209.139.226:8545",
      derRpcUrl:
        this.settingsForm.derRpcUrl.value || this.env.DER_RPC_URL || "http://134.209.139.226:8545",
      seed: this.settingsForm.seed.value || this.settingsForm.sk.value,
      sk: this.settingsForm.sk.value || this.env.SK,
      numberOfDERs: {
        Solar: isNaN(nSolar) ? 1 : nSolar,
        Wind: isNaN(nWind) ? 1 : nWind,
      },
      contractAddress:
        this.settingsForm.contractAddress.value || "0x384e79D871eA213768F4e91970032a04A7C55993",
    };
  }

  get clockData(): ClockOptions {
    const startingTimestamp = this.parseLocalDate(this.settingsForm.startTimestamp.value);
    return {
      ...(startingTimestamp && { startingTimestamp }),
      tickIncrement: parseInt(this.settingsForm.tickIncrement.value) || 1,
      tickInterval: parseInt(this.settingsForm.tickInterval.value) * 1000 || 1000,
    };
  }

  get flexibilityData(): FlexibilityOptions {
    return {
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
