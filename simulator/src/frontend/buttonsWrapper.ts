export default class ButtonWrapper {
  public readonly buttons = Array.from(document.querySelectorAll("button"));
  public readonly startButton = document.getElementById("start") as HTMLButtonElement;
  public readonly stopButton = document.getElementById("stop") as HTMLButtonElement;
  public readonly spinner = document.getElementById("spinner") as HTMLDivElement;
  public readonly pauseButton = document.getElementById("pause") as HTMLButtonElement;
  public readonly flexibilityBtn = document.getElementById(
    "flexibilityRequestBtn"
  ) as HTMLButtonElement;

  public loading(loading: boolean) {
    if (loading) {
      this.buttons.forEach((button) => {
        button.disabled = loading;
      });
    } else {
      this.stopButton.disabled = loading;
      this.pauseButton.disabled = loading;
      this.flexibilityBtn.disabled = loading;
    }
    this.spinner.style.display = loading ? "block" : "none";
  }

  public playing(playing: boolean) {
    this.stopButton.disabled = !playing;
    this.pauseButton.disabled = !playing;
    this.startButton.disabled = playing;
    if (!playing) {
      this.pauseButton.classList.remove("paused");
      this.pauseButton.innerHTML = '<span class="icon icon-pause"></span>';
    }
  }

  public pause() {
    this.pauseButton.innerHTML = this.pauseButton.classList.toggle("paused")
      ? '<span class="icon icon-play"></span>'
      : '<span class="icon icon-pause"></span>';
  }
}
