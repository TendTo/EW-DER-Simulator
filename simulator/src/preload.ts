import { contextBridge, ipcRenderer } from "electron";
import { ElectronAPI } from "./module";

const api: ElectronAPI = {
  send: {
    stopSimulation() {
      ipcRenderer.send("stopSimulation");
    },
    startSimulation(data) {
      ipcRenderer.send("startSimulation", data);
    },
  },
  invoke: {},
  on: {
    newReading(listener) {
      ipcRenderer.on("newReading", listener);
    },
  },
};
contextBridge.exposeInMainWorld("electronAPI", api);
