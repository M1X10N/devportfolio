import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { Window } from "happy-dom";
import { initPortfolio } from "../src/scripts/portfolio.ts";

// These checks exercise the built HTML and interaction code in a DOM emulator.
// They do not replace a browser check of layout, native focus trapping or touch.
const html = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
const titles = [
  "Introduction",
  "About Me",
  "Achievements",
  "Projects",
  "Currently Learning",
  "Contact",
];

function fixture({ reducedMotion = false } = {}) {
  const window = new Window({
    url: "https://portfolio.example/",
    settings: {
      enableJavaScriptEvaluation: false,
      disableCSSFileLoading: true,
    },
  });
  const mediaListeners = new Set();
  let reduce = reducedMotion;
  const media = {
    get matches() {
      return reduce;
    },
    media: "(prefers-reduced-motion: reduce)",
    addEventListener(type, listener) {
      if (type === "change") mediaListeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "change") mediaListeners.delete(listener);
    },
  };
  window.matchMedia = () => media;
  window.document.write(html);
  const { document } = window;

  // happy-dom has no browser top layer. Emulate only the native dialog methods;
  // application focus, cancellation, animation and close handlers remain real.
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.showModal = () => {
      dialog.setAttribute("open", "");
    };
    dialog.close = (value = "") => {
      if (!dialog.open) return;
      dialog.returnValue = value;
      dialog.removeAttribute("open");
      dialog.dispatchEvent(new window.Event("close"));
    };
  }
  const cleanup = initPortfolio(document);
  const cards = [...document.querySelectorAll("[data-card-index]")];
  const stage = document.querySelector("[data-carousel-stage]");
  assert.ok(stage, "built page includes the carousel stage");
  return {
    window,
    document,
    cards,
    stage,
    teardown: cleanup,
    active: () =>
      cards.findIndex((card) => card.getAttribute("aria-current") === "true"),
    click: (element) =>
      element.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, detail: 1 }),
      ),
    key: (key) =>
      stage.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key,
          bubbles: true,
          cancelable: true,
        }),
      ),
    pointer: (target, type, x, y, pointerType = "mouse") => {
      const event = new window.PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: x,
        clientY: y,
        isPrimary: true,
      });
      target.dispatchEvent(event);
      return event;
    },
    setReducedMotion(value) {
      reduce = value;
      const event = new window.Event("change");
      Object.defineProperty(event, "matches", { value });
      for (const listener of mediaListeners) listener(event);
    },
    async dispose() {
      cleanup();
      await window.happyDOM.close();
    },
  };
}

async function withFixture(options, callback) {
  const page = fixture(options);
  try {
    await callback(page);
  } finally {
    await page.dispose();
  }
}

async function eventually(assertion) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      assertion();
      return;
    } catch (error) {
      if (attempt === 39) throw error;
      await delay(15);
    }
  }
}

test("built card faces contain only a section title and an accessible decorative icon", async () => {
  await withFixture({}, ({ cards, document }) => {
    assert.equal(cards.length, 6);
    cards.forEach((card, index) => {
      assert.equal(card.textContent.replace(/\s+/g, " ").trim(), titles[index]);
      assert.equal(card.tagName, "BUTTON");
      assert.ok(card.querySelector('svg[aria-hidden="true"]'));
      assert.equal(card.getAttribute("aria-haspopup"), "dialog");
      assert.ok(document.getElementById(card.getAttribute("aria-controls")));
    });
    assert.equal(document.querySelectorAll("dialog[open]").length, 0);
    assert.equal(document.querySelectorAll("[data-section-dialog]").length, 6);
    assert.equal(
      document.querySelectorAll("[data-open-section]").length >= 6,
      true,
      "an alternative section menu reaches every section",
    );
  });
});

test("previous/next, arrow keys, Home/End and position indicators wrap and stay in sync", async () => {
  await withFixture({}, (page) => {
    const { document, active, click, key } = page;
    assert.equal(active(), 0);
    assert.deepEqual(
      page.cards.map((card) => card.tabIndex),
      [0, -1, -1, -1, -1, -1],
      "only the visible active card is in the tab order",
    );
    click(document.querySelector("[data-previous]"));
    assert.equal(active(), 5);
    click(document.querySelector("[data-next]"));
    assert.equal(active(), 0);
    key("ArrowRight");
    assert.equal(active(), 1);
    key("ArrowLeft");
    assert.equal(active(), 0);
    key("End");
    assert.equal(active(), 5);
    key("Home");
    assert.equal(active(), 0);
    click(document.querySelector('[data-position="3"]'));
    assert.equal(active(), 3);
    assert.equal(
      document.querySelectorAll('[data-position][aria-current="true"]').length,
      1,
    );
    assert.equal(
      document
        .querySelector('[data-position="3"]')
        .getAttribute("aria-current"),
      "true",
    );
    assert.deepEqual(
      page.cards.map((card) => card.tabIndex),
      [-1, -1, -1, 0, -1, -1],
    );
    assert.match(
      document.querySelector("[data-carousel-status]").textContent,
      /Projects.*4.*6/,
    );
  });
});

test("opening a section focuses its close control, pauses rotation and restores the exact opener", async () => {
  await withFixture({}, async (page) => {
    const { document, cards, click, key, active } = page;
    const opener = cards[0];
    opener.focus();
    click(opener);
    const dialog = document.getElementById("section-introduction");
    assert.equal(dialog.open, true);
    assert.equal(
      document.activeElement,
      dialog.querySelector("[data-close-dialog]"),
    );
    const before = active();
    key("ArrowRight");
    click(document.querySelector("[data-next]"));
    assert.equal(
      active(),
      before,
      "carousel state is unchanged while a dialog is open",
    );
    click(dialog.querySelector("[data-close-dialog]"));
    await eventually(() => assert.equal(dialog.open, false));
    assert.equal(document.activeElement, opener);
  });
});

test("Escape cancellation closes the dialog and returns focus to the closed menu summary", async () => {
  await withFixture({ reducedMotion: true }, async (page) => {
    const { document, window, click } = page;
    const menu = document.querySelector("#section-menu");
    if (menu) menu.open = true;
    const opener = document.querySelector('[data-open-section="learning"]');
    opener.focus();
    click(opener);
    const dialog = document.getElementById("section-learning");
    assert.equal(dialog.open, true);
    if (menu) assert.equal(menu.open, false);
    dialog.dispatchEvent(new window.Event("cancel", { cancelable: true }));
    await eventually(() => assert.equal(dialog.open, false));
    assert.equal(
      document.activeElement,
      menu ? menu.querySelector("summary") : opener,
    );
  });
});

test("horizontal dragging rotates without opening a section on the trailing click", async () => {
  await withFixture({}, (page) => {
    const { cards, stage, document, pointer, click, active } = page;
    pointer(cards[0], "pointerdown", 300, 100);
    pointer(stage, "pointermove", 80, 108);
    pointer(stage, "pointerup", 80, 108);
    click(cards[0]);
    assert.notEqual(active(), 0, "drag advances the active card");
    assert.equal(
      document.querySelectorAll("dialog[open]").length,
      0,
      "the click generated after a drag never opens content",
    );
    // Native keyboard activation emits click with detail=0. It remains usable
    // immediately, without inheriting the preceding pointer's suppression.
    const keyboardCard = cards[active()];
    keyboardCard.focus();
    keyboardCard.click();
    assert.equal(
      document.getElementById(keyboardCard.getAttribute("aria-controls")).open,
      true,
    );
  });
});

test("touch capture transfer from a card does not cancel an ongoing horizontal drag", async () => {
  await withFixture({}, (page) => {
    const { cards, stage, document, pointer, click, active } = page;
    pointer(cards[0], "pointerdown", 300, 100, "touch");
    pointer(stage, "pointermove", 276, 103, "touch");
    // Touch browsers initially capture to the card. Moving capture to the stage
    // emits a bubbling lostpointercapture on that card, not on the stage.
    pointer(cards[0], "lostpointercapture", 276, 103, "touch");
    pointer(stage, "pointermove", 80, 106, "touch");
    pointer(stage, "pointerup", 80, 106, "touch");
    assert.notEqual(active(), 0);
    click(cards[0]);
    assert.equal(document.querySelectorAll("dialog[open]").length, 0);
  });
});

test("a vertical touch gesture preserves page scrolling and carousel position", async () => {
  await withFixture({}, (page) => {
    const { cards, stage, document, pointer, active, click } = page;
    pointer(cards[0], "pointerdown", 150, 100, "touch");
    const move = pointer(stage, "pointermove", 154, 230, "touch");
    pointer(stage, "pointerup", 154, 230, "touch");
    assert.equal(move.defaultPrevented, false);
    assert.equal(active(), 0);
    click(cards[0]);
    assert.equal(
      document.querySelectorAll("dialog[open]").length,
      0,
      "a trailing click after a vertical gesture does not open a section",
    );
  });
});

test("changing motion preference during the session updates interaction immediately", async () => {
  await withFixture(
    {},
    ({ document, cards, active, key, setReducedMotion }) => {
      key("ArrowRight");
      assert.equal(active(), 1);
      setReducedMotion(true);
      assert.ok(
        document
          .querySelector("[data-carousel]")
          .classList.contains("is-reduced-motion"),
      );
      assert.ok(
        cards.every((card) => card.tabIndex === 0),
        "all static grid cards are directly tabbable",
      );
      key("ArrowRight");
      assert.equal(active(), 1);
      setReducedMotion(false);
      assert.equal(cards.filter((card) => card.tabIndex === 0).length, 1);
      key("ArrowRight");
      assert.equal(active(), 2);
    },
  );
});

test("reduced motion keeps section activation and disables spatial rotation", async () => {
  await withFixture({ reducedMotion: true }, (page) => {
    const { cards, stage, document, pointer, key, active, click } = page;
    assert.ok(cards.every((card) => card.tabIndex === 0));
    key("ArrowRight");
    pointer(cards[0], "pointerdown", 300, 100);
    pointer(stage, "pointermove", 80, 105);
    pointer(stage, "pointerup", 80, 105);
    assert.equal(active(), 0);
    click(cards[4]);
    assert.equal(document.getElementById("section-learning").open, true);
  });
});

test("all six sections open, empty states stay inside dialogs, and contact URLs are real", async () => {
  await withFixture({ reducedMotion: true }, async (page) => {
    const { document, cards, click } = page;
    for (const card of cards) {
      click(card);
      const dialog = document.getElementById(
        card.getAttribute("aria-controls"),
      );
      assert.equal(dialog.open, true);
      assert.ok(
        document.getElementById(dialog.getAttribute("aria-labelledby")),
      );
      assert.ok(dialog.querySelector(".dialog-scroll"));
      click(dialog.querySelector("[data-close-dialog]"));
      await eventually(() => assert.equal(dialog.open, false));
    }
    assert.equal(
      document
        .querySelector("#section-projects .empty-state")
        .textContent.trim(),
      "Coming soon",
    );
    assert.equal(
      document
        .querySelector("#section-achievements .empty-state")
        .textContent.trim(),
      "Coming soon",
    );
    assert.equal(
      document.querySelectorAll("#section-learning .learning-topic").length,
      3,
    );
    assert.equal(
      document
        .querySelector('#section-contact a[href^="mailto:"]')
        .getAttribute("href"),
      "mailto:sirajhamza491@gmail.com",
    );
    const instagram = document.querySelector(
      '#section-contact a[href^="https://www.instagram.com/"]',
    );
    assert.equal(
      instagram.getAttribute("href"),
      "https://www.instagram.com/wv.sir4j/",
    );
    assert.ok(instagram.relList.contains("noopener"));
    assert.ok(instagram.relList.contains("noreferrer"));
    assert.doesNotMatch(
      document.body.textContent,
      /Ryan Fitzgerald|Lorem ipsum|your-email@example\.com|Senior Software Engineer/,
    );
  });
});

function wheel(page, target, deltaY, extra = {}) {
  const event = new page.window.WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    deltaY,
    ...extra,
  });
  // happy-dom's WheelEvent extends UIEvent instead of MouseEvent and omits
  // modifier fields; provide the native ctrlKey field for the zoom regression.
  Object.defineProperty(event, "ctrlKey", { value: extra.ctrlKey ?? false });
  target.dispatchEvent(event);
  return event;
}

test("wheel advances once per burst, suppresses trailing clicks, and reverses after idle", async () => {
  await withFixture({}, async (page) => {
    assert.equal(wheel(page, page.cards[0], 120).defaultPrevented, true);
    assert.equal(page.active(), 1);
    for (const delta of [120, 90, 40, 12, 2]) wheel(page, page.stage, delta);
    assert.equal(page.active(), 1, "momentum cannot skip additional cards");
    page.click(page.cards[1]);
    assert.equal(page.document.querySelectorAll("dialog[open]").length, 0);
    await delay(250);
    wheel(page, page.stage, -120);
    assert.equal(page.active(), 0, "upward wheel moves backward");
    await delay(250);
    wheel(page, page.stage, -120);
    assert.equal(page.active(), 5, "backward wraps to last card");
  });
});

test("small trackpad deltas accumulate and direction changes reset accumulation", async () => {
  await withFixture({}, (page) => {
    for (let i = 0; i < 7; i++) wheel(page, page.stage, 5);
    assert.equal(page.active(), 0);
    wheel(page, page.stage, -5);
    assert.equal(page.active(), 0);
    for (let i = 0; i < 7; i++) wheel(page, page.stage, -5);
    assert.equal(page.active(), 5);
    for (let i = 0; i < 20; i++) wheel(page, page.stage, -2);
    assert.equal(page.active(), 5);
  });
});

test("line, page, and horizontal wheel deltas are normalized", async () => {
  for (const options of [
    { deltaY: 3, deltaMode: 1 },
    { deltaY: 1, deltaMode: 2 },
    { deltaY: 0, deltaX: 80 },
  ]) {
    await withFixture({}, (page) => {
      wheel(page, page.stage, options.deltaY, options);
      assert.equal(page.active(), 1);
    });
  }
});

test("wheel leaves page, modal content, zoom, and reduced-motion scrolling alone", async () => {
  await withFixture({}, (page) => {
    assert.equal(wheel(page, page.document.body, 100).defaultPrevented, false);
    assert.equal(
      wheel(page, page.stage, 100, { ctrlKey: true }).defaultPrevented,
      false,
    );
    page.click(page.cards[0]);
    const dialog = page.document.getElementById("section-introduction");
    assert.equal(
      wheel(page, dialog.querySelector(".dialog-scroll"), 100).defaultPrevented,
      false,
    );
    assert.equal(wheel(page, page.stage, 100).defaultPrevented, false);
    assert.equal(page.active(), 0);
  });
  await withFixture({ reducedMotion: true }, (page) => {
    assert.equal(wheel(page, page.stage, 100).defaultPrevented, false);
    assert.equal(page.active(), 0);
    page.click(page.cards[3]);
    assert.equal(page.document.getElementById("section-projects").open, true);
  });
});

test("ring geometry keeps panel yaw readable and removes rear face flipping", async () => {
  await withFixture({}, (page) => {
    for (let step = 0; step < 6; step++) {
      page.key("ArrowRight");
      const seen = new Set();
      for (const card of page.cards) {
        const x = Number(card.style.getPropertyValue("--ring-x"));
        const depth = Number(card.style.getPropertyValue("--depth"));
        const yaw = parseFloat(card.style.getPropertyValue("--panel-yaw"));
        assert.ok(Math.abs(yaw) <= 28);
        assert.ok(Math.abs(x * x + depth * depth - 1) < 0.001);
        seen.add(`${x},${depth}`);
        assert.equal(card.style.getPropertyValue("--face-flip"), "");
      }
      assert.equal(seen.size, 6);
    }
    assert.doesNotMatch(
      page.document.body.textContent,
      /A SPACE FOR IDEAS|Six chapters|EXPLORE THE ORBIT/,
    );
  });
});

test("typewriter keeps full accessible text and headings visible, progresses, and Show all skips", async () => {
  await withFixture({}, async (page) => {
    const dialog = page.document.getElementById("section-introduction");
    const paragraph = dialog.querySelector("[data-typewriter]");
    const fullText = paragraph.textContent;
    page.click(page.cards[0]);
    assert.equal(dialog.open, true);
    assert.equal(dialog.querySelector("h2").textContent, "Introduction");
    assert.equal(
      page.document.activeElement,
      dialog.querySelector("[data-close-dialog]"),
    );
    assert.equal(
      paragraph.querySelector("[data-typewriter-source]").textContent,
      fullText,
    );
    assert.equal(
      paragraph
        .querySelector("[data-typewriter-visual]")
        .getAttribute("aria-hidden"),
      "true",
    );
    assert.equal(
      paragraph.querySelector("[data-typewriter-visual]").textContent,
      "",
    );
    assert.equal(
      dialog.querySelector("[aria-live]"),
      null,
      "no character-by-character announcements",
    );
    await delay(130);
    const partial = paragraph.querySelector(
      "[data-typewriter-visual]",
    ).textContent;
    assert.ok(partial.length > 0 && partial.length < fullText.length);
    const show = dialog.querySelector("[data-show-all]");
    assert.equal(show.hidden, false);
    show.focus();
    page.click(show);
    assert.equal(paragraph.textContent, fullText);
    assert.equal(dialog.hasAttribute("data-typing"), false);
    assert.equal(page.document.activeElement, show);
    await delay(100);
    assert.equal(paragraph.textContent, fullText, "no restart after skipping");
  });
});

test("typewriter stops on close, resets on reopening, and responds to reduced motion", async () => {
  await withFixture({}, async (page) => {
    const dialog = page.document.getElementById("section-about");
    const paragraph = dialog.querySelector("[data-typewriter]");
    const fullText = paragraph.textContent;
    page.click(page.cards[1]);
    await delay(80);
    page.click(dialog.querySelector("[data-close-dialog]"));
    await eventually(() => assert.equal(dialog.open, false));
    assert.equal(paragraph.textContent, fullText);
    page.click(page.cards[1]);
    assert.equal(
      paragraph.querySelector("[data-typewriter-visual]").textContent,
      "",
    );
    const show = dialog.querySelector("[data-show-all]");
    show.focus();
    page.setReducedMotion(true);
    assert.equal(paragraph.textContent, fullText);
    assert.equal(show.hidden, true);
    assert.equal(
      page.document.activeElement,
      dialog.querySelector("[data-close-dialog]"),
    );
    await delay(100);
    assert.equal(paragraph.querySelector("[data-typewriter-visual]"), null);
  });
});

test("contact links and reduced-motion text are immediate and never typed", async () => {
  await withFixture({}, (page) => {
    page.click(page.cards[5]);
    const contact = page.document.getElementById("section-contact");
    assert.equal(contact.querySelector("[data-show-all]").hidden, true);
    assert.equal(contact.hasAttribute("data-typing"), false);
    assert.equal(
      contact.querySelectorAll("[data-typewriter-visual]").length,
      0,
    );
    assert.equal(
      contact.querySelector('a[href^="mailto:"]').getAttribute("href"),
      "mailto:sirajhamza491@gmail.com",
    );
    assert.equal(
      contact.querySelector('a[target="_blank"]').getAttribute("href"),
      "https://www.instagram.com/wv.sir4j/",
    );
  });
  await withFixture({ reducedMotion: true }, (page) => {
    page.click(page.cards[4]);
    const dialog = page.document.getElementById("section-learning");
    assert.equal(dialog.querySelector("[data-show-all]").hidden, true);
    assert.equal(dialog.querySelectorAll("[data-typewriter-visual]").length, 0);
    assert.ok(dialog.querySelector("[data-typewriter]").textContent.length > 0);
  });
});

test("short text finishes naturally without looping or restarting", async () => {
  await withFixture({}, async (page) => {
    page.click(page.cards[3]);
    const dialog = page.document.getElementById("section-projects");
    await delay(420);
    assert.equal(dialog.hasAttribute("data-typing"), false);
    assert.equal(
      dialog.querySelector(".empty-state").textContent,
      "Coming soon",
    );
    await delay(80);
    assert.equal(dialog.querySelector("[data-typewriter-visual]"), null);
  });
});

test("touch interaction disables hover until mouse input resumes on hybrid devices", async () => {
  await withFixture({}, (page) => {
    const carousel = page.document.querySelector("[data-carousel]");
    page.pointer(page.cards[0], "pointerdown", 100, 100, "touch");
    assert.equal(carousel.classList.contains("is-touch-input"), true);
    page.pointer(page.stage, "pointerup", 100, 100, "touch");
    assert.equal(carousel.classList.contains("is-touch-input"), true);
    page.pointer(page.stage, "pointermove", 110, 100, "mouse");
    assert.equal(carousel.classList.contains("is-touch-input"), false);
  });
});

test("teardown cancels typing and restores the complete text", async () => {
  const page = fixture();
  try {
    const dialog = page.document.getElementById("section-introduction");
    const paragraph = dialog.querySelector("[data-typewriter]");
    const fullText = paragraph.textContent;
    page.click(page.cards[0]);
    assert.equal(dialog.hasAttribute("data-typing"), true);
    page.teardown();
    await delay(80);
    assert.equal(paragraph.textContent, fullText);
    assert.equal(paragraph.querySelector("[data-typewriter-visual]"), null);
  } finally {
    await page.dispose();
  }
});
