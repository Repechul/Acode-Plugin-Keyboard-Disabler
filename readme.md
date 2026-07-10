# Keyboard Disabler

Lock the Android touch keyboard in Acode with a floating button or a double
tap, without losing the ability to move the cursor by touching the screen.

Compatible with the **CodeMirror 6** engine (default in Acode 1.11+) and the
legacy **Ace** engine, automatically detecting which one is in use.

## Usage

- **Floating button**: drag it wherever you want. A single tap toggles the
  keyboard lock.
  - Locked (colored icon): the keyboard is hidden and will not reappear even
    if you touch the screen or move the cursor.
  - Unlocked: as soon as you touch the screen or place the cursor, the
    keyboard resumes normal behavior.
- **Double tap** on the active file's tab (the tab where you select and/or
  close the current working file, not the text-editing area): does exactly
  the same thing as the button. Enabled/disabled and its delay can be
  configured in the plugin settings, and it automatically re-binds to
  whichever tab becomes active when you switch, open, or close files.
- **Command**: "Toggle Keyboard Lock" in the Command Palette (default
  shortcut `Ctrl-Alt-K`).

## Settings

From the plugin page in Acode you can:

- Show or hide the floating button.
- Enable or disable the double-tap gesture.
- Adjust the maximum delay (ms) between the two taps.

## How it works

When locked, the plugin hides the keyboard (using Cordova's native keyboard
plugin when available) and marks the editable area as `inputmode="none"`,
which is the standard mechanism to prevent the touch keyboard from reopening
while still allowing you to tap/position the cursor. When released, this
mark is simply removed, and the next tap resumes normal behavior.

---

## Licence: MIT
