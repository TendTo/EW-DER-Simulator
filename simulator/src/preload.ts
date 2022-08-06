import { contextBridge, ipcRenderer } from "electron";
import { ElectronAPI } from "./module";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const api: ElectronAPI = {
  send: {
    stopSimulation() {
      ipcRenderer.send("stopSimulation");
    },
    startSimulation(data, clockOptions, initialFunds) {
      ipcRenderer.send("startSimulation", data, clockOptions, initialFunds);
    },
    derVariation(derVariationData) {
      ipcRenderer.send("derVariation", derVariationData);
    },
    flexibilityRequest(flexibilityData) {
      ipcRenderer.send("flexibilityRequest", flexibilityData);
    },
    pauseResumeSimulation() {
      ipcRenderer.send("pauseResumeSimulation");
    },
  },
  invoke: {},
  on: {
    setBaseline(listener) {
      ipcRenderer.on("setBaseline", listener);
    },
    toast(listener) {
      ipcRenderer.on("toast", listener);
    },
    agreementEvent(listener) {
      ipcRenderer.on("agreementEvent", listener);
    },
    startLoading(listener) {
      ipcRenderer.on("startLoading", listener);
    },
    stopLoading(listener) {
      ipcRenderer.on("stopLoading", listener);
    },
    aggregatorBalance(listener) {
      ipcRenderer.on("aggregatorBalance", listener);
    },
    newAggregatedReading(listener) {
      ipcRenderer.on("newAggregatedReading", listener);
    },
    newReading(listener) {
      ipcRenderer.on("newReading", listener);
    },
    flexibilityEvent(listener) {
      ipcRenderer.on("flexibilityEvent", listener);
    },
  },
  env: {},
};
// If file .env exists, read it and set env variables in the api.env object
// with the key being the env variable name and the value being the env variable value
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf8").trim().split("\n");
  env.forEach((line) => {
    const [key, value] = line.split("=");
    api.env[key.trim()] = value.trim();
  });
}
contextBridge.exposeInMainWorld("electronAPI", api);
