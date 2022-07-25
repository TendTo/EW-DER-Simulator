import { BlockchainOptions, ClockOptions } from "../module";
import { SettingsForm } from "./types";

export default class FromWrapper {
  private form: SettingsForm;

  constructor() {
    this.form = document.getElementById("settings") as SettingsForm;
  }

  get blockchainData(): BlockchainOptions {
    const nSolar = parseInt(this.form.numberOfSolarDERs.value);
    const nWind = parseInt(this.form.numberOfWindDERs.value);
    return {
      rpcUrl: this.form.rpcUrl.value || "http://134.209.139.226:8545",
      seed: this.form.seed.value || this.form.sk.value,
      sk: this.form.sk.value,
      numberOfDERs: {
        Solar: isNaN(nSolar) ? 1 : nSolar,
        Wind: isNaN(nWind) ? 1 : nWind,
      },
      contractAddress:
        this.form.contractAddress.value || "0xCE3b21daF429B705d5f8eA3d409c047641a4496B",
    };
  }

  get clockData(): ClockOptions {
    const startingTimestamp = new Date(`${this.form.startTimestamp.value}Z`).getTime() / 1000;
    return {
      ...(startingTimestamp && { startingTimestamp }),
      tickIncrement: parseInt(this.form.tickIncrement.value) || 1,
      tickInterval: parseInt(this.form.tickInterval.value) * 1000 || 1000,
    };
  }
}
