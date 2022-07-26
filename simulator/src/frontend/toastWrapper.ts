import { ToastType } from "./types";

export default class ToastWrapper {
  private toastTemplate: HTMLTemplateElement;
  private toastContainer: HTMLDivElement;

  constructor() {
    this.toastContainer = document.getElementById("toastContainer") as HTMLDivElement;
    this.toastTemplate = document.getElementById("toastTemplate") as HTMLTemplateElement;
  }

  public show(message: string, type: ToastType = "success", duration: number = 4000) {
    const clone = this.toastTemplate.content.cloneNode(true) as HTMLElement;
    const div = clone.querySelector("div");
    div.textContent = message;
    if (type === "success") div.style.backgroundColor = "var(--success)";
    else if (type === "info") div.style.backgroundColor = "var(--primary)";
    else if (type === "error") div.style.backgroundColor = "var(--error)";
    else if (type === "warning") div.style.backgroundColor = "var(--warning)";
    this.toastContainer.prepend(div);

    setTimeout(() => {
      div.classList.add("show");
    }, 1);

    setTimeout(() => {
      div.remove();
    }, duration);
  }
}
