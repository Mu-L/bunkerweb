class Popover {
  constructor() {
    this.init();
  }

  init() {
    window.addEventListener("pointerover", (e) => {
      //POPOVER LOGIC
      try {
        if (
          e.target.closest("button").hasAttribute(`data-popover-btn`) ||
          e.target.closest("svg").hasAttribute(`data-popover-btn`)
        ) {
          this.showPopover(e.target);
        }
      } catch (err) {}
    });

    window.addEventListener("pointerout", (e) => {
      //POPOVER LOGIC
      try {
        if (
          e.target.closest("button").hasAttribute(`data-popover-btn`) ||
          e.target.closest("svg").hasAttribute(`data-popover-btn`)
        ) {
          this.hidePopover(e.target);
        }
      } catch (err) {}
    });
  }

  showPopover(el) {
    const btn = el.closest("button").hasAttribute("data-popover-btn")
      ? el.closest("button")
      : el.closest("svg");
    const popoverName = btn.getAttribute("data-popover-btn");
    //toggle curr popover
    const popover = btn.parentElement.querySelector(
      `[data-popover-content=${popoverName}]`,
    );
    popover.classList.add("transition-all", "delay-200", "opacity-0");
    popover.classList.remove("hidden");
    setTimeout(() => {
      popover.classList.remove("opacity-0");
    }, 10);
  }

  hidePopover(el) {
    const btn = el.closest("button").hasAttribute("data-popover-btn")
      ? el.closest("button")
      : el.closest("svg");
    const popoverName = btn.getAttribute("data-popover-btn");
    //toggle curr popover
    const popover = btn.parentElement.querySelector(
      `[data-popover-content=${popoverName}]`,
    );
    popover.classList.add("hidden");
    popover.classList.remove("transition-all", "delay-200");
  }
}

class TabsSelect {
  constructor(tabContainer, contentContainer) {
    this.tabContainer = tabContainer;
    this.contentContainer = contentContainer;
    this.tabArrow = tabContainer
      .querySelector("[data-tab-select-dropdown-btn]")
      .querySelector("[data-tab-select-dropdown-arrow]");
    this.init();
  }

  init() {
    window.addEventListener("click", (e) => {
      try {
        if (
          e.target.closest("button").hasAttribute("data-tab-select-handler")
        ) {
          //get needed data
          const tab = e.target.closest("button");
          const tabAtt = tab.getAttribute("data-tab-select-handler");
          const text = tab.textContent;
          // change style
          this.resetTabsStyle();
          this.highlightClicked(tabAtt);
          //show content
          this.hideAllSettings();
          this.showSettingClicked(tabAtt);
          //close dropdown and change btn textcontent on mobile
          this.setDropBtnText(tabAtt, text);
          this.closeDropdown();
        }
      } catch (e) {}

      try {
        if (
          e.target
            .closest("button")
            .hasAttribute("data-tab-select-dropdown-btn")
        ) {
          this.toggleDropdown();
        }
      } catch (err) {}
    });
  }

  resetTabsStyle() {
    const tabsEl = this.tabContainer.querySelectorAll(
      "button[data-tab-select-handler]",
    );
    tabsEl.forEach((tab) => {
      tab.classList.remove("active");
    });
  }

  highlightClicked(tabAtt) {
    const tabMobile = this.tabContainer.querySelector(
      `button[data-tab-select-handler='${tabAtt}']`,
    );
    tabMobile.classList.add("active");
  }

  hideAllSettings() {
    const plugins =
      this.contentContainer.querySelectorAll("[data-plugin-item]");
    plugins.forEach((plugin) => {
      plugin.classList.add("hidden");
    });
  }

  showSettingClicked(tabAtt) {
    const plugin = this.contentContainer.querySelector(
      `[data-plugin-item='${tabAtt}']`,
    );
    plugin.classList.remove("hidden");
  }

  setDropBtnText(tabAtt, text) {
    const dropBtn = this.tabContainer.querySelector(
      "[data-tab-select-dropdown-btn]",
    );
    dropBtn.setAttribute("data-tab-id", tabAtt);
    dropBtn.querySelector("span").textContent = text;
  }

  closeDropdown() {
    const dropdown = this.tabContainer.querySelector(
      "[data-tab-select-dropdown]",
    );
    dropdown.classList.add("hidden");
    dropdown.classList.remove("flex");

    this.updateTabArrow();
  }

  toggleDropdown() {
    const dropdown = this.tabContainer.querySelector(
      "[data-tab-select-dropdown]",
    );
    dropdown.classList.toggle("hidden");
    dropdown.classList.toggle("flex");

    this.updateTabArrow();
  }

  updateTabArrow() {
    const dropdown = this.tabContainer.querySelector(
      "[data-tab-select-dropdown]",
    );

    if (dropdown.classList.contains("hidden")) {
      this.tabArrow.classList.remove("rotate-180");
    }

    if (dropdown.classList.contains("flex")) {
      this.tabArrow.classList.add("rotate-180");
    }
  }
}

class FormatValue {
  constructor() {
    this.inputs = document.querySelectorAll("input");
    this.init();
  }

  init() {
    this.inputs.forEach((inp) => {
      try {
        inp.setAttribute("value", inp.getAttribute("value").trim());
        inp.value = inp.value.trim();
      } catch (err) {}
    });
  }
}

class FilterSettings {
  constructor(inputID, tabContainer, contentContainer) {
    this.input = document.querySelector(`input#${inputID}`);
    this.tabContainer = tabContainer;
    this.contentContainer = contentContainer;
    this.tabsEls = this.tabContainer.querySelectorAll(
      `[data-tab-select-handler]`,
    );
    this.init();
  }

  init() {
    this.input.addEventListener("input", () => {
      this.resetFilter();
      //get inp format
      const inpValue = this.input.value.trim().toLowerCase();

      //loop all tabs
      this.tabsEls.forEach((tab) => {
        //get settings of tabs except multiples
        const settings = this.getSettingsFromTab(tab);

        //compare total count to currCount to determine
        //if tabs need to be hidden
        const settingCount = settings.length;
        let hiddenCount = 0;
        settings.forEach((setting) => {
          try {
            const title = setting
              .querySelector("h5")
              .textContent.trim()
              .toLowerCase();
            if (!title.includes(inpValue)) {
              setting.classList.add("hidden");
              hiddenCount++;
            }
          } catch (err) {}
        });
        //case no setting match, check if match at least tab name
        //if not, hide tab
        if (settingCount === hiddenCount) {
          const tabName = tab.getAttribute(`data-tab-select-handler`);
          const tabTxt = tab.textContent.trim().toLowerCase();
          if (!tabTxt.includes(inpValue)) {
            tab.classList.add("!hidden");

            this.contentContainer
              .querySelector(`[data-plugin-item=${tabName}]`)
              .classList.add("hidden");
          }
        }
      });

      // check current tabs states
      let isAllHidden = true;
      let firstNotHiddenEl = null;
      for (let i = 0; i < this.tabsEls.length; i++) {
        const tab = this.tabsEls[i];
        if (!tab.classList.contains("!hidden")) {
          isAllHidden = false;
          firstNotHiddenEl = tab;
          break;
        }
      }

      // case no tab match
      if (isAllHidden) {
        this.tabContainer
          .querySelector("[data-tab-select-dropdown-btn]")
          .setAttribute("data-tab-id", "no-match");
        return (this.tabContainer.querySelector(
          "[data-tab-select-dropdown-btn] span",
        ).textContent = "No match");
      }

      // click first not hidden tab
      const currTabEl = this.tabContainer.querySelector(
        "[data-tab-select-dropdown-btn]",
      );

      const currTabName = currTabEl.getAttribute("data-tab-id");

      // case previously no match
      if (currTabName === "no-match" && !isAllHidden) {
        return firstNotHiddenEl.click();
      }

      const currTabBtn = this.tabContainer.querySelector(
        `[data-tab-select-handler='${currTabName}']`,
      );

      if (!currTabBtn.classList.contains("!hidden")) {
        return currTabBtn.click();
      }

      if (currTabBtn.classList.contains("!hidden")) {
        return firstNotHiddenEl.click();
      }
    });
  }

  resetFilter() {
    this.tabsEls.forEach((tab) => {
      const tabName = tab.getAttribute(`data-tab-select-handler`);
      //hide mobile and desk tabs
      tab.classList.remove("!hidden");
      this.contentContainer
        .querySelector(`[data-plugin-item=${tabName}]`)
        .classList.remove("hidden");
      const settings = this.getSettingsFromTab(tab);
      settings.forEach((setting) => {
        setting.classList.remove("hidden");
      });
    });
  }

  getSettingsFromTab(tabEl) {
    const tabName = tabEl.getAttribute(`data-tab-select-handler`);
    const settingContainer = this.contentContainer
      .querySelector(`[data-plugin-item="${tabName}"]`)
      .querySelector(`[data-plugin-settings]`);
    const settings = settingContainer.querySelectorAll(
      "[data-setting-container]",
    );
    return settings;
  }
}

class Tabs {
  constructor() {
    this.init();
  }

  init() {
    window.addEventListener("click", (e) => {
      try {
        if (e.target.closest("button").hasAttribute("data-tab-handler")) {
          //get needed data
          const tab = e.target.closest("button");
          const tabAtt = tab.getAttribute("data-tab-handler");
          const container = tab.closest("div[data-service-content]");
          // change style
          this.resetTabsStyle(container);
          this.highlightClicked(container, tabAtt);
          this.hideAllSettings(container);
          this.showSettingClicked(container, tabAtt);
        }
      } catch (err) {}
    });
  }

  resetTabsStyle(container) {
    //reset desktop style
    const tabsEk = container.querySelectorAll("button[data-tab-handler]");
    tabsEk.forEach((tab) => {
      tab.classList.remove("active");
    });
  }

  highlightClicked(container, tabAtt) {
    //desktop case
    const tab = container.querySelector(`button[data-tab-handler='${tabAtt}']`);
    tab.classList.add("active");
  }

  hideAllSettings(container) {
    const tabsContent = container.querySelectorAll("[data-tab-item]");

    tabsContent.forEach((tabContent) => {
      tabContent.classList.add("hidden");
    });
  }

  showSettingClicked(container, tabAtt) {
    const tabContent = container.querySelector(`[data-tab-item='${tabAtt}']`);
    tabContent.classList.remove("hidden");
  }
}

class CheckNoMatchFilter {
  constructor(
    input,
    type,
    elsToCheck,
    elContainer,
    noMatchEl,
    classToCheck = "hidden",
  ) {
    this.input = input;
    this.type = type;
    this.elsToCheck = elsToCheck;
    this.elContainer = elContainer;
    this.noMatchEl = noMatchEl;
    this.classToCheck = classToCheck;
    this.init();
  }

  init() {
    if (!this.input || !this.elsToCheck || !this.noMatchEl) return;

    const event = this.type === "input" ? "input" : "click";

    if (!this.input.length) {
      this.input.addEventListener(event, () => {
        this.check();
      });
    }

    if (this.input.length) {
      this.input.forEach((inp) => {
        inp.addEventListener(event, () => {
          this.check();
        });
      });
    }
  }

  check() {
    setTimeout(() => {
      let isAllHidden = true;
      for (let i = 0; i < this.elsToCheck.length; i++) {
        const el = this.elsToCheck[i];
        if (!el.classList.contains(this.classToCheck)) {
          isAllHidden = false;
          break;
        }
      }

      if (isAllHidden) {
        this.noMatchEl.classList.remove(this.classToCheck);
        this.elContainer
          ? this.elContainer.classList.add(this.classToCheck)
          : false;
      }

      if (!isAllHidden) {
        this.elContainer
          ? this.elContainer.classList.remove(this.classToCheck)
          : false;
        this.noMatchEl.classList.add(this.classToCheck);
      }
    }, 20);
  }
}

class showInvalid {
  constructor() {
    this.init();
  }

  init() {
    window.addEventListener("change", (e) => {
      this.setInvalidState(e);
    });

    window.addEventListener("input", (e) => {
      this.setInvalidState(e);
    });

    window.addEventListener("click", (e) => {
      this.setInvalidState(e);
    });
  }

  setInvalidState(e) {
    try {
      if (e.target.hasAttribute("data-setting-input")) {
        const settingName = e.target.getAttribute("id");
        const invalidEl = document.querySelector(
          `[data-invalid=${settingName}]`,
        );
        const isValid = e.target.validity.valid;

        if (isValid) {
          e.target.classList.remove("invalid");
          invalidEl.classList.add("hidden", "md:hidden");
          return;
        }
        if (!isValid) {
          e.target.classList.add("invalid");
          invalidEl.classList.remove("hidden", "md:hidden");
          return;
        }
      }
    } catch (e) {}
  }
}

export {
  Popover,
  Tabs,
  TabsSelect,
  FormatValue,
  FilterSettings,
  CheckNoMatchFilter,
  showInvalid,
};
