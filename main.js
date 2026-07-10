function () {
  "use strict";

  var PLUGIN_ID = "com.acode.plugin.key.dis.repechul";

  var DEFAULTS = {
    showButton: true,
    doubleTapEnabled: true,
    doubleTapDelay: 300, // ms
    btnLeft: null,
    btnTop: null,
  };

  var DOUBLE_TAP_MAX_DIST = 40; // px

  var locked = false;

  var acodeSettings = null;
  var state = null;

  function ensureSettings() {
    if (state) return state;
    acodeSettings = acode.require("settings");
    var s = acodeSettings.value[PLUGIN_ID];
    var changed = false;
    if (!s) {
      s = Object.assign({}, DEFAULTS);
      acodeSettings.value[PLUGIN_ID] = s;
      changed = true;
    } else {
      for (var k in DEFAULTS) {
        if (!(k in s)) {
          s[k] = DEFAULTS[k];
          changed = true;
        }
      }
      for (var ok in s) {
        if (!(ok in DEFAULTS)) {
          delete s[ok];
          changed = true;
        }
      }
    }
    if (changed) acodeSettings.update(false);
    state = s;
    return state;
  }
  function persist() {
    if (acodeSettings) acodeSettings.update(false);
  }
  function toBool(value, fallback) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      var s = value.trim().toLowerCase();
      if (s === "true" || s === "1" || s === "on" || s === "yes") return true;
      if (s === "false" || s === "0" || s === "off" || s === "no" || s === "") return false;
    }
    return typeof fallback === "boolean" ? fallback : !!value;
  }
  function toNumber(value, fallback, min, max) {
    var n = NaN;
    if (typeof value === "number") {
      n = value;
    } else if (typeof value === "string") {
      n = parseFloat(value);
    } else if (value && typeof value === "object" && "value" in value) {
      n = parseFloat(value.value);
    }
    if (isNaN(n)) n = fallback;
    if (typeof min === "number") n = Math.max(min, n);
    if (typeof max === "number") n = Math.min(max, n);
    return Math.round(n);
  }
  function getEditableElement() {
    var editor = window.editorManager && editorManager.editor;
    if (!editor) return null;
    if (editorManager.isCodeMirror) {
      return editor.contentDOM || null;
    }
    try {
      if (editor.textInput && typeof editor.textInput.getElement === "function") {
        return editor.textInput.getElement();
      }
    } catch (e) {
      /* noop */
    }

    if (window.editorManager && editorManager.container) {
      return editorManager.container.querySelector("textarea");
    }
    return null;
  }

  function forceHideKeyboardNow() {
    try {
      if (window.cordova && cordova.plugins && cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hide();
      } else if (window.Keyboard && typeof window.Keyboard.hide === "function") {
        window.Keyboard.hide();
      }
    } catch (e) {
      /* noop */
    }
    try {
      var active = document.activeElement;
      if (active && typeof active.blur === "function") active.blur();
    } catch (e) {
      /* noop */
    }
  }
  function applyLockState() {
    var el = getEditableElement();
    if (!el) return;
    if (locked) {
      el.setAttribute("inputmode", "none");
    } else {
      el.removeAttribute("inputmode");
    }
  }
  function setLocked(value, opts) {
    opts = opts || {};
    locked = !!value;
    if (locked) {
      forceHideKeyboardNow();
    }
    applyLockState();
    if (fab) fab.setLocked(locked);
    if (!opts.silent && window.toast) {
      window.toast(locked ? "Keyboard locked" : "Keyboard unlocked", 1200);
    }
  }
  function toggleLocked() {
    setLocked(!locked);
  }
  var KEYBOARD_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M19.437,18.5H4.562a2.5,2.5,0,0,1-2.5-2.5V8a2.5,2.5,0,0,1,2.5-2.5H19.437a2.5,2.5,0,0,1,2.5,2.5v8A2.5,2.5,0,0,1,19.437,18.5ZM4.562,6.5A1.5,1.5,0,0,0,3.062,8v8a1.5,1.5,0,0,0,1.5,1.5H19.437a1.5,1.5,0,0,0,1.5-1.5V8a1.5,1.5,0,0,0-1.5-1.5Z"/>' +
    '<path d="M5.548,16.5h12.9a.5.5,0,0,0,0-1H5.548a.5.5,0,0,0,0,1Z"/>' +
    '<circle cx="5.82" cy="9.248" r="0.75"/><circle cx="9.94" cy="9.248" r="0.75"/>' +
    '<circle cx="14.06" cy="9.248" r="0.75"/><circle cx="18.18" cy="9.248" r="0.75"/>' +
    '<circle cx="5.82" cy="12.998" r="0.75"/><circle cx="9.94" cy="12.998" r="0.75"/>' +
    '<circle cx="14.06" cy="12.998" r="0.75"/><circle cx="18.18" cy="12.998" r="0.75"/>' +
    "</svg>";
  var STYLE_ID = "kbd-disabler-style";
  var CSS =
    "#kbd-disabler-fab{position:fixed;width:46px;height:46px;border-radius:50%;" +
    "background:#232634;color:#c7cbd4;display:flex;align-items:center;justify-content:center;" +
    "box-shadow:0 3px 10px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.06);" +
    "z-index:999999;touch-action:none;cursor:pointer;user-select:none;" +
    "transition:background-color .18s ease,transform .12s ease;right:18px;bottom:120px;}" +
    "#kbd-disabler-fab.kbd-locked{background:#17a598;color:#fff;}" +
    "#kbd-disabler-fab.kbd-dragging{transition:none;transform:scale(1.08);}" +
    "#kbd-disabler-fab svg{width:22px;height:22px;pointer-events:none;display:block;}" +
    "#kbd-disabler-fab .kbd-disabler-dot{position:absolute;top:-2px;right:-2px;width:12px;height:12px;" +
    "border-radius:50%;background:#fff;border:2px solid #17a598;display:none;}" +
    "#kbd-disabler-fab.kbd-locked .kbd-disabler-dot{display:block;}";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  function removeStyle() {
    var style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }
  var fab = null;
  function createFab() {
    injectStyle();
    var el = document.createElement("div");
    el.id = "kbd-disabler-fab";
    el.setAttribute("aria-label", "Lock/unlock keyboard");
    el.innerHTML = KEYBOARD_SVG + '<span class="kbd-disabler-dot"></span>';
    if (typeof state.btnLeft === "number" && typeof state.btnTop === "number") {
      el.style.left = state.btnLeft + "px";
      el.style.top = state.btnTop + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    }
    var dragging = false;
    var moved = false;
    var startX = 0,
      startY = 0,
      startLeft = 0,
      startTop = 0;
    var THRESH = 8;
    function onDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      moved = false;
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {
        /* noop */
      }
      var rect = el.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      startX = e.clientX;
      startY = e.clientY;
      el.classList.add("kbd-dragging");
    }

    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > THRESH || Math.abs(dy) > THRESH) moved = true;
      if (!moved) return;
      var maxLeft = window.innerWidth - el.offsetWidth - 4;
      var maxTop = window.innerHeight - el.offsetHeight - 4;
      var newLeft = Math.min(Math.max(4, startLeft + dx), Math.max(4, maxLeft));
      var newTop = Math.min(Math.max(4, startTop + dy), Math.max(4, maxTop));
      el.style.left = newLeft + "px";
      el.style.top = newTop + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("kbd-dragging");
      if (moved) {
        state.btnLeft = parseFloat(el.style.left) || 0;
        state.btnTop = parseFloat(el.style.top) || 0;
        persist();
      } else {
        toggleLocked();
      }
    }
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    document.body.appendChild(el);
    return {
      el: el,
      setLocked: function (isLocked) {
        el.classList.toggle("kbd-locked", isLocked);
      },
      setVisible: function (visible) {
        el.style.display = visible ? "flex" : "none";
      },
      destroy: function () {
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        el.remove();
      },
    };
  }
  var lastTapTime = 0;
  var lastTapX = 0;
  var lastTapY = 0;
  var currentTabEl = null;

  function getActiveTabElement() {
    try {
      var file = window.editorManager && editorManager.activeFile;
      return (file && file.tab) || null;
    } catch (e) {
      return null;
    }
  }
  function onTabPointerDown(e) {
    if (!state.doubleTapEnabled) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.isPrimary === false) {
      lastTapTime = 0;
      return;
    }
    var now = Date.now();
    var dx = Math.abs(e.clientX - lastTapX);
    var dy = Math.abs(e.clientY - lastTapY);
    if (
      now - lastTapTime <= state.doubleTapDelay &&
      dx <= DOUBLE_TAP_MAX_DIST &&
      dy <= DOUBLE_TAP_MAX_DIST
    ) {
      lastTapTime = 0;
      toggleLocked();
      return;
    }
    lastTapTime = now;
    lastTapX = e.clientX;
    lastTapY = e.clientY;
  }
  function detachDoubleTap() {
    if (currentTabEl) {
      currentTabEl.removeEventListener("pointerdown", onTabPointerDown);
      currentTabEl = null;
    }
  }
  function attachDoubleTap() {
    var tab = getActiveTabElement();
    if (tab === currentTabEl) return; // ya enganchado al tab correcto
    detachDoubleTap();
    currentTabEl = tab;
    if (currentTabEl) {
      currentTabEl.addEventListener("pointerdown", onTabPointerDown, { passive: true });
    }
  }

  function onEditorChanged() {
    if (locked) applyLockState();
    attachDoubleTap();
  }
  var keyboardModule = null;
  function onKeyboardShow() {
    if (locked) forceHideKeyboardNow();
  }
  function init() {
    fab = createFab();
    fab.setVisible(state.showButton);
    attachDoubleTap();
    if (window.editorManager) {
      editorManager.on("switch-file", onEditorChanged);
      editorManager.on("file-loaded", onEditorChanged);
      editorManager.on("new-file", onEditorChanged);
      editorManager.on("init-open-file-list", onEditorChanged);
    }
    try {
      keyboardModule = acode.require("keyboard");
      if (keyboardModule && typeof keyboardModule.on === "function") {
        keyboardModule.on("keyboardShow", onKeyboardShow);
      }
    } catch (e) {
      keyboardModule = null;
    }
    try {
      var commands = acode.require("commands");
      commands.addCommand({
        name: "keyboardDisabler.toggle",
        description: "Toggle keyboard lock",
        bindKey: { win: "Ctrl-Alt-K", mac: "Command-Alt-K" },
        exec: function () {
          toggleLocked();
          return true;
        },
      });
    } catch (e) {
      /* noop */
    }
  }

  function unmount() {
    if (locked) {
      locked = false;
      applyLockState();
    }

    if (fab) {
      fab.destroy();
      fab = null;
    }
    removeStyle();

    detachDoubleTap();

    if (window.editorManager) {
      editorManager.off("switch-file", onEditorChanged);
      editorManager.off("file-loaded", onEditorChanged);
      editorManager.off("new-file", onEditorChanged);
      editorManager.off("init-open-file-list", onEditorChanged);
    }

    if (keyboardModule && typeof keyboardModule.off === "function") {
      keyboardModule.off("keyboardShow", onKeyboardShow);
    }

    try {
      var commands = acode.require("commands");
      commands.removeCommand("keyboardDisabler.toggle");
    } catch (e) {
      /* noop */
    }
  }
  if (window.acode) {
    ensureSettings();

    function onSettingsChange(key, value) {
      switch (key) {
        case "showButton":
          state.showButton = toBool(value, state.showButton);
          if (fab) fab.setVisible(state.showButton);
          break;
        case "doubleTapEnabled":
          state.doubleTapEnabled = toBool(value, state.doubleTapEnabled);
          break;
        case "doubleTapDelay":
          state.doubleTapDelay = toNumber(value, state.doubleTapDelay, 100, 2000);
          break;
        default:
          return;
      }
      persist();
    }

    var settingsConfig = {
      list: [
        {
          key: "showButton",
          text: "Show floating button",
          checkbox: state.showButton,
          info: "Show or hide the floating button to lock the keyboard.",
        },
        {
          key: "doubleTapEnabled",
          text: "Double tap to toggle",
          checkbox: state.doubleTapEnabled,
          info: "Double-tap the current file's tab to lock/unlock the keyboard.",
        },
        {
          key: "doubleTapDelay",
          text: "Max delay between touches",
          value: state.doubleTapDelay,
          prompt: "Max delay between touches (ms)",
          promptType: "number",
          info: "Max time in milliseconds between the two taps.",
        },
      ],
      cb: onSettingsChange,
    };

    acode.setPluginInit(PLUGIN_ID, init, settingsConfig);
    acode.setPluginUnmount(PLUGIN_ID, unmount);
  }
})();
