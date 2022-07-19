import { app, BrowserWindow } from "electron";
import * as path from "path";
import IPCHandler from "./backend/IPCHandler";

class Main {
  private mainWindow: BrowserWindow;

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      height: 600,
      width: 800,
      titleBarStyle: "hidden",
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    });

    this.mainWindow.loadFile(path.join(__dirname, "../../index.html"));
    IPCHandler.init(this.mainWindow);
    IPCHandler.registerHandlers();
  }

  private onWindowAllClosed() {
    if (process.platform !== "darwin") {
      app.quit();
    }
  }

  private onActivate() {
    if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
  }

  public init() {
    console.log("INIT");
    app.on("ready", this.createWindow);
    app.on("window-all-closed", this.onWindowAllClosed);
    app.on("activate", this.onActivate);
  }
}

new Main().init();
