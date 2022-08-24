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
    const sk = this.settingsForm.sk.value || this.env.SK;
    if (!sk) {
      this.toastWrapper.show("Please enter your SK", "error");
      throw Error("No private key provided");
    }

    const nSolar = parseInt(this.settingsForm.numberOfSolarDERs.value || this.env.N_SOLAR);
    const nWind = parseInt(this.settingsForm.numberOfWindDERs.value || this.env.N_SOLAR);

    return {
      aggRpcUrl:
        this.settingsForm.aggRpcUrl.value || this.env.AGG_RPC_URL || "http://134.209.139.226:8545",
      derRpcUrl:
        this.settingsForm.derRpcUrl.value || this.env.DER_RPC_URL || "http://134.209.139.226:8545",
      seed: this.settingsForm.seed.value || sk,
      sk,
      numberOfDERs: {
        Solar: isNaN(nSolar) ? 1 : nSolar,
        Wind: isNaN(nWind) ? 1 : nWind,
      },
      contractAddress:
        this.settingsForm.contractAddress.value ||
        this.env.CONTRACT_ADDRESS ||
        "0x875a44537B84C46397dDb7526cE5DF66612fC5b4",
    };
  }

  get clockData(): ClockOptions {
    const startingTimestamp = this.parseLocalDate(this.settingsForm.startTimestamp.value);
    return {
      ...(startingTimestamp && { startingTimestamp }),
      tickIncrement:
        parseInt(this.settingsForm.tickIncrement.value || this.env.TICK_INCREMENT) || 1,
      tickInterval:
        parseInt(this.settingsForm.tickInterval.value || this.env.TICK_INTERVAL) * 1000 || 1000,
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
