/** Visitor-controlled navigation. Content itself stays in the server-rendered dialogs. */
const mounted = new WeakMap<HTMLElement, () => void>();

export function initPortfolio(
  scope: Document | HTMLElement = document,
): () => void {
  const foundCarousel = scope.querySelector<HTMLElement>("[data-carousel]");
  if (!foundCarousel) return () => {};
  const carousel = foundCarousel;
  const existing = mounted.get(carousel);
  if (existing) return existing;

  const doc = carousel.ownerDocument;
  const win = doc.defaultView;
  const stage = carousel.querySelector<HTMLElement>("[data-carousel-stage]");
  const ring = carousel.querySelector<HTMLElement>("[data-carousel-ring]");
  const cards = [
    ...carousel.querySelectorAll<HTMLButtonElement>("[data-card-index]"),
  ];
  const positions = [
    ...carousel.querySelectorAll<HTMLButtonElement>("[data-position]"),
  ];
  const status = carousel.querySelector<HTMLElement>("[data-carousel-status]");
  if (!win || !stage || !ring || !cards.length) return () => {};

  const motion = win.matchMedia?.("(prefers-reduced-motion: reduce)");
  const removers: (() => void)[] = [];
  const observers: IntersectionObserver[] = [];
  const count = cards.length;
  const angle = 360 / count;
  const stageLabel = stage.getAttribute("aria-label");
  const stageDescription = stage.getAttribute("aria-roledescription");
  let selected = 0;
  let rotation = 0;
  let suppressedUntil = 0;
  let activeDialog: HTMLDialogElement | null = null;
  let opener: HTMLElement | null = null;
  let closeTimer: number | undefined;
  let gesture: {
    id: number;
    x: number;
    y: number;
    dx: number;
    dragging: boolean;
    vertical: boolean;
  } | null = null;

  function on(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ) {
    target.addEventListener(type, listener, options);
    removers.push(() => target.removeEventListener(type, listener, options));
  }

  const normalize = (value: number) => ((value % count) + count) % count;
  const reduced = () => motion?.matches ?? false;
  const paused = () => activeDialog !== null;

  function paint(dragAngle = 0) {
    ring!.style.setProperty("--rotation", `${rotation + dragAngle}deg`);
    cards.forEach((card, index) => {
      const offset =
        normalize(index - selected + Math.floor(count / 2)) -
        Math.floor(count / 2);
      const depth = Math.cos(
        ((index * angle + rotation + dragAngle) * Math.PI) / 180,
      );
      card.style.setProperty("--offset", String(offset));
      card.style.setProperty("--depth", depth.toFixed(4));
      card.style.setProperty("--face-flip", depth < 0 ? "180deg" : "0deg");
      card.classList.toggle("is-active", index === selected);
      // Offscreen mobile cards stay reachable by arrows and the section menu,
      // without leaving hidden buttons in the sequential Tab order.
      card.tabIndex = reduced() || index === selected ? 0 : -1;
      if (index === selected) card.setAttribute("aria-current", "true");
      else card.removeAttribute("aria-current");
    });
    positions.forEach((button) => {
      const current = Number(button.dataset.position) === selected;
      if (current) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    if (status) {
      const title =
        cards[selected].querySelector(".card-title")?.textContent ??
        cards[selected].textContent;
      status.textContent = `${title?.trim()} · ${selected + 1} of ${count}`;
    }
  }

  function select(index: number) {
    if (paused() || reduced()) return;
    const next = normalize(index);
    let distance = next - selected;
    if (distance > count / 2) distance -= count;
    if (distance < -count / 2) distance += count;
    rotation -= distance * angle;
    selected = next;
    paint();
  }

  function finishGesture(cancelled = false) {
    if (!gesture) return;
    const finished = gesture;
    gesture = null;
    if (finished.vertical) suppressedUntil = Date.now() + 450;
    if (finished.dragging) {
      suppressedUntil = Date.now() + 450;
      carousel.classList.remove("is-dragging");
      carousel.style.setProperty("--drag-x", "0px");
      if (!cancelled && Math.abs(finished.dx) >= 40) {
        const steps = Math.max(1, Math.round(Math.abs(finished.dx) / 150));
        select(selected + (finished.dx < 0 ? steps : -steps));
      } else paint();
    }
    if (stage!.hasPointerCapture?.(finished.id))
      stage!.releasePointerCapture(finished.id);
  }

  function syncMotion() {
    finishGesture(true);
    carousel.classList.toggle("is-reduced-motion", reduced());
    if (reduced()) {
      stage!.setAttribute("aria-label", "Portfolio sections");
      stage!.removeAttribute("aria-roledescription");
    } else {
      if (stageLabel) stage!.setAttribute("aria-label", stageLabel);
      if (stageDescription)
        stage!.setAttribute("aria-roledescription", stageDescription);
    }
    paint();
  }

  function finishClose(dialog: HTMLDialogElement) {
    win!.clearTimeout(closeTimer);
    dialog.classList.remove("is-closing");
    if (dialog.open) dialog.close();
  }

  function closeDialog(dialog: HTMLDialogElement) {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    if (reduced()) finishClose(dialog);
    else {
      dialog.classList.add("is-closing");
      closeTimer = win!.setTimeout(() => finishClose(dialog), 180);
    }
  }

  function openSection(id: string | undefined, trigger: HTMLElement) {
    if (!id || paused()) return;
    const dialog = doc.getElementById(
      `section-${id}`,
    ) as HTMLDialogElement | null;
    if (!dialog || typeof dialog.showModal !== "function") return;
    finishGesture(true);
    opener = trigger;
    activeDialog = dialog;
    const menu = doc.getElementById(
      "section-menu",
    ) as HTMLDetailsElement | null;
    if (menu) menu.open = false;
    dialog.classList.remove("is-closing");
    dialog.showModal();
    doc.documentElement.classList.add("dialog-open");
    trigger.setAttribute("aria-expanded", "true");
    const scroll = dialog.querySelector<HTMLElement>(".dialog-scroll");
    if (scroll) scroll.scrollTop = 0;
    dialog
      .querySelector<HTMLElement>("[data-close-dialog]")
      ?.focus({ preventScroll: true });
  }

  on(stage, "pointerdown", ((event: PointerEvent) => {
    if (
      event.button !== 0 ||
      event.isPrimary === false ||
      paused() ||
      reduced()
    )
      return;
    // Do not capture until a horizontal gesture is established: vertical touch scrolling stays native.
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      dragging: false,
      vertical: false,
    };
  }) as EventListener);

  on(
    stage,
    "pointermove",
    ((event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.id || gesture.vertical)
        return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
          gesture.vertical = true;
          suppressedUntil = Date.now() + 450;
          return;
        }
        if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
        gesture.dragging = true;
        carousel.classList.add("is-dragging");
        stage!.setPointerCapture?.(event.pointerId);
      }
      gesture.dx = dx;
      event.preventDefault();
      carousel.style.setProperty("--drag-x", `${dx}px`);
      paint(dx * (angle / 180));
    }) as EventListener,
    { passive: false },
  );

  on(stage, "pointerup", ((event: PointerEvent) => {
    if (gesture?.id === event.pointerId) finishGesture();
  }) as EventListener);
  on(stage, "pointercancel", ((event: PointerEvent) => {
    if (gesture?.id === event.pointerId) finishGesture(true);
  }) as EventListener);
  on(stage, "lostpointercapture", ((event: PointerEvent) => {
    // Touch starts with implicit capture on a card. Its lost-capture event
    // bubbles here when horizontal dragging transfers capture to the stage.
    if (event.target === stage && gesture?.id === event.pointerId)
      finishGesture(true);
  }) as EventListener);
  on(stage, "dragstart", ((event: DragEvent) =>
    event.preventDefault()) as EventListener);
  on(
    stage,
    "click",
    ((event: MouseEvent) => {
      // Keyboard activation has detail=0 and remains available immediately after a drag.
      if (Date.now() < suppressedUntil && event.detail !== 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }) as EventListener,
    { capture: true },
  );

  cards.forEach((card) => {
    on(card, "click", (() =>
      openSection(card.dataset.section, card)) as EventListener);
  });
  carousel
    .querySelectorAll<HTMLElement>("[data-previous]")
    .forEach((button) => {
      on(button, "click", (() => select(selected - 1)) as EventListener);
    });
  carousel.querySelectorAll<HTMLElement>("[data-next]").forEach((button) => {
    on(button, "click", (() => select(selected + 1)) as EventListener);
  });
  positions.forEach((button) => {
    on(button, "click", (() =>
      select(Number(button.dataset.position))) as EventListener);
  });
  on(stage, "keydown", ((event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || paused() || reduced())
      return;
    const indices: Record<string, number> = {
      ArrowLeft: selected - 1,
      ArrowRight: selected + 1,
      Home: 0,
      End: count - 1,
    };
    if (!(event.key in indices)) return;
    event.preventDefault();
    const wasCard = cards.includes(event.target as HTMLButtonElement);
    select(indices[event.key]);
    if (wasCard) cards[selected].focus({ preventScroll: true });
  }) as EventListener);

  doc
    .querySelectorAll<HTMLElement>("[data-open-section]")
    .forEach((trigger) => {
      on(trigger, "click", (() =>
        openSection(trigger.dataset.openSection, trigger)) as EventListener);
    });
  doc
    .querySelectorAll<HTMLDialogElement>("[data-section-dialog]")
    .forEach((dialog) => {
      dialog
        .querySelectorAll<HTMLElement>("[data-close-dialog]")
        .forEach((button) => {
          on(button, "click", (() => closeDialog(dialog)) as EventListener);
        });
      on(dialog, "cancel", ((event: Event) => {
        event.preventDefault();
        closeDialog(dialog);
      }) as EventListener);
      on(dialog, "click", ((event: MouseEvent) => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          closeDialog(dialog);
        }
      }) as EventListener);
      on(dialog, "close", (() => {
        win!.clearTimeout(closeTimer);
        dialog.classList.remove("is-closing");
        activeDialog = null;
        doc.documentElement.classList.remove("dialog-open");
        const restore = opener;
        opener = null;
        restore?.setAttribute("aria-expanded", "false");
        if (restore?.isConnected) {
          const menu = restore.closest<HTMLDetailsElement>("details");
          const focusTarget =
            menu && !menu.open
              ? menu.querySelector<HTMLElement>("summary")
              : restore;
          focusTarget?.focus({ preventScroll: true });
        }
      }) as EventListener);

      if (win.IntersectionObserver) {
        const observer = new win.IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            });
          },
          { root: dialog.querySelector(".dialog-scroll"), threshold: 0.08 },
        );
        dialog.querySelectorAll<HTMLElement>(".reveal").forEach((element) => {
          element.classList.add("will-reveal");
          observer.observe(element);
        });
        observers.push(observer);
      }
    });

  if (motion) on(motion, "change", syncMotion as EventListener);
  syncMotion();
  carousel.dataset.enhanced = "true";

  const destroy = () => {
    win.clearTimeout(closeTimer);
    removers.forEach((remove) => remove());
    observers.forEach((observer) => observer.disconnect());
    if (activeDialog?.open) activeDialog.close();
    doc.documentElement.classList.remove("dialog-open");
    delete carousel.dataset.enhanced;
    mounted.delete(carousel);
  };
  mounted.set(carousel, destroy);
  return destroy;
}

if (typeof document !== "undefined") initPortfolio();
