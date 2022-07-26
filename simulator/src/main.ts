import { app, BrowserWindow } from "electron";
import * as path from "path";
import IPCHandler from "./backend/IPCHandler";
import * as log4js from "log4js";

class Main {
  private mainWindow: BrowserWindow;

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      height: 600,
      width: 800,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
      icon: path.join(__dirname, "../../public/icons/icon.ico"),
    });

    this.mainWindow.loadFile(path.join(__dirname, "../frontend/index.html"));
    this.mainWindow.webContents.openDevTools();
    this.mainWindow.once("ready-to-show", () => this.mainWindow.maximize());
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

  private configureLogger() {
    log4js.configure({
      appenders: {
        console: {
          type: "stdout",
        },
        all: { type: "file", filename: "logs/logs.log" },
        errors: {
          type: "file",
          filename: "logs/errors.log",
        },
        errorsFilter: {
          type: "logLevelFilter",
          appender: "errors",
          level: "error",
        },
        aggregator: {
          type: "file",
          filename: "logs/aggregator.log",
        },
        iot: {
          type: "file",
          filename: "logs/iot.log",
        },
      },
      categories: {
        default: {
          appenders: ["console", "all", "errorsFilter"],
          level: "debug",
        },
        iot: {
          appenders: ["console", "all", "errorsFilter", "iot"],
          level: "debug",
        },
        aggregator: {
          appenders: ["console", "all", "errorsFilter", "aggregator"],
          level: "debug",
        },
      },
    });
  }

  public init() {
    this.configureLogger();
    app.once("ready", this.createWindow);
    app.once("window-all-closed", this.onWindowAllClosed);
    app.once("activate", this.onActivate);
  }
}

new Main().init();
