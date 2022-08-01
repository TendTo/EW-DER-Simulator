import { contextBridge, ipcRenderer } from "electron";
import { ElectronAPI } from "./module";

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
  },
  invoke: {},
  on: {
    toast(listener) {
      ipcRenderer.on("toast", listener);
    },
    registerAgreementEvent(listener) {
      ipcRenderer.on("registerAgreementEvent", listener);
    },
    cancelAgreementEvent(listener) {
      ipcRenderer.on("cancelAgreementEvent", listener);
    },
    reviseAgreementEvent(listener) {
      ipcRenderer.on("reviseAgreementEvent", listener);
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
};
contextBridge.exposeInMainWorld("electronAPI", api);
