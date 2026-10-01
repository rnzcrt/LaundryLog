"use strict";

function initializeMainTabs(rootDocument) {
  const tabs = Array.from(rootDocument.querySelectorAll(".main-tab"));
  const panels = Array.from(rootDocument.querySelectorAll(".tab-panel"));
  const newOrderButton = rootDocument.getElementById("openNewOrder");

  function activate(tabName, moveFocus = false) {
    if (!tabs.some((tab) => tab.dataset.tab === tabName)) return;

    for (const tab of tabs) {
      const selected = tab.dataset.tab === tabName;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && moveFocus) tab.focus();
    }

    for (const panel of panels) {
      panel.hidden = panel.dataset.panel !== tabName;
    }

    newOrderButton.hidden = tabName !== "orders" && tabName !== "kanban";
  }

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => activate(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabs.length - 1;
      else return;

      event.preventDefault();
      activate(tabs[nextIndex].dataset.tab, true);
    });
  }

  const initialTab = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0];
  if (initialTab) activate(initialTab.dataset.tab);
}

if (typeof module === "object" && module.exports) {
  module.exports = initializeMainTabs;
} else {
  initializeMainTabs(document);
}
