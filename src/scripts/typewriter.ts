/** Visual-only typing: the complete paragraph stays available to assistive tech. */
export function createTypewriter(dialog: HTMLDialogElement, win: Window) {
  const control = dialog.querySelector<HTMLButtonElement>("[data-show-all]");
  let timer: number | undefined;
  let restore: (() => void)[] = [];

  function finish() {
    win.clearInterval(timer);
    timer = undefined;
    restore.forEach((reset) => reset());
    restore = [];
    if (control && !control.hidden) {
      // Keep the control in place so skipping never unexpectedly loses focus.
      control.textContent = "All text shown";
      control.setAttribute("aria-disabled", "true");
    }
    dialog.removeAttribute("data-typing");
  }

  function start(reduced: boolean) {
    finish();
    if (!control) return;
    control.hidden = true;
    if (reduced) return;
    const paragraphs = [
      ...dialog.querySelectorAll<HTMLElement>("[data-typewriter]"),
    ];
    const rows = paragraphs
      .map((element) => {
        const text = element.textContent ?? "";
        const characters = Array.from(text);
        const source = dialog.ownerDocument.createElement("span");
        source.className = "sr-only";
        source.dataset.typewriterSource = "";
        source.textContent = text;
        const visual = dialog.ownerDocument.createElement("span");
        visual.dataset.typewriterVisual = "";
        visual.setAttribute("aria-hidden", "true");
        const remainder = dialog.ownerDocument.createElement("span");
        remainder.className = "typewriter-remainder";
        remainder.setAttribute("aria-hidden", "true");
        remainder.textContent = text;
        element.replaceChildren(source, visual, remainder);
        restore.push(() =>
          element.replaceChildren(dialog.ownerDocument.createTextNode(text)),
        );
        return { characters, visual, remainder, progress: 0 };
      })
      .filter((row) => row.characters.length);
    if (!rows.length) return;
    control.textContent = "Show all";
    control.removeAttribute("aria-disabled");
    control.hidden = false;
    dialog.setAttribute("data-typing", "");
    let index = 0;
    // Two Unicode code points per 50ms (~40 chars/sec), once per opening.
    timer = win.setInterval(() => {
      const row = rows[index];
      row.progress = Math.min(row.progress + 2, row.characters.length);
      row.visual.textContent = row.characters.slice(0, row.progress).join("");
      row.remainder.textContent = row.characters.slice(row.progress).join("");
      if (row.progress === row.characters.length) index++;
      if (index === rows.length) finish();
    }, 50);
  }

  const skip = () => {
    finish();
    dialog
      .querySelectorAll(".reveal")
      .forEach((element) => element.classList.add("is-visible"));
  };
  control?.addEventListener("click", skip);
  return {
    start,
    finish,
    destroy() {
      finish();
      control?.removeEventListener("click", skip);
    },
  };
}
