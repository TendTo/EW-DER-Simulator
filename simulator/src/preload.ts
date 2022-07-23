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
  },
  invoke: {},
  on: {
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
  },
};
contextBridge.exposeInMainWorld("electronAPI", api);
