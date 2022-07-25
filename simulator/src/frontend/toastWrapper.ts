import Toastify from "toastify-js";
import { ToastType } from "./types";

export default class ToastWrapper {
  private getToast() {
    return Toastify({
      close: true,
      gravity: "bottom",
      position: "center",
    });
  }

  public show(message: string, type: ToastType, duration: number = 3000) {
    const toast = this.getToast();
    toast.options.text = message;
    toast.options.duration = duration;
    if (type === "success") toast.options.style["background-color"] = "var(--success)";
    else if (type === "info") toast.options.style["background-color"] = "var(--primary)";
    else if (type === "error") toast.options.style["background-color"] = "var(--error)";
    else if (type === "warning") toast.options.style["background-color"] = "var(--warning)";
    console.log("FEST");
    toast.showToast();
  }
}
