//debug.js

import { Pane } from 'tweakpane';

export const DEBUG_FOLDERS = {
  MSDF_TEXT: 'MSDFText',
};

class Debug {
  static instance = null;
  static ENABLED = false;

  #pane = null;
  #baseFolder = null;
  #folders = new Map();

  static getInstance() {
    if (Debug.instance === null) {
      Debug.instance = new Debug();
    }
    return Debug.instance;
  }
  constructor() {
    if (Debug.ENABLED) {
      this.#pane = new Pane();
      this.#baseFolder = this.#pane.addFolder({ title: 'Debug' });
      this.#baseFolder.expanded = false;
    }
  }
  createNoOpProxy() {
    const handler = {
      get:
        () =>
        (..._args) =>
          this.createNoOpProxy(),
    };
    return new Proxy({}, handler);
  }

  getFolder(name) {
    if (!Debug.ENABLED) {
      return this.createNoOpProxy();
    }
    const existing = this.#folders.get(name);
    if (existing) {
      return existing;
    }
    const folder = this.#baseFolder.addFolder({ title: name });
    this.#folders.set(name, folder);
    return folder;
  }
}

export default Debug;
