(() => {
  const nativeStorage = window.localStorage;
  const storageApi = "/api/storage";
  const excludedKeys = new Set(["good_etc_rpg_save_v1"]);
  const useRemoteStorage =
    location.protocol === "http:" || location.protocol === "https:";
  let items = {};
  let remotePath = "";
  let remoteReady = false;
  let dirty = false;
  let flushTimer = 0;

  function readNativeItems() {
    const next = {};
    try {
      Object.keys(nativeStorage).forEach((key) => {
        if (!excludedKeys.has(key)) next[key] = nativeStorage.getItem(key);
      });
    } catch {
      // Keep the in-memory store empty if localStorage is unavailable.
    }
    return next;
  }

  function syncNativeItems() {
    try {
      Object.entries(items).forEach(([key, value]) => {
        if (!excludedKeys.has(key)) nativeStorage.setItem(key, String(value));
      });
    } catch {
      // The remote store remains authoritative for EXE/server runs.
    }
  }

  function loadRemoteItems() {
    if (!useRemoteStorage) return;
    try {
      const request = new XMLHttpRequest();
      request.open("GET", storageApi, false);
      request.send();
      if (request.status < 200 || request.status >= 300) return;
      const payload = JSON.parse(request.responseText || "{}");
      if (!payload || typeof payload !== "object") return;
      if (payload.items && typeof payload.items === "object") {
        Object.entries(payload.items).forEach(([key, value]) => {
          if (!excludedKeys.has(key) && value != null)
            items[key] = String(value);
        });
      }
      remotePath = payload.path || "";
      remoteReady = true;
      syncNativeItems();
    } catch {
      remoteReady = false;
    }
  }

  function postItems(sync = false) {
    if (!remoteReady || !dirty) return;
    dirty = false;
    const body = JSON.stringify({ items });
    if (!sync && window.fetch) {
      fetch(storageApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {
        dirty = true;
      });
      return;
    }
    try {
      const request = new XMLHttpRequest();
      request.open("POST", storageApi, false);
      request.setRequestHeader("Content-Type", "application/json");
      request.send(body);
      if (request.status < 200 || request.status >= 300) dirty = true;
    } catch {
      dirty = true;
    }
  }

  function scheduleFlush() {
    if (!remoteReady) return;
    window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => postItems(false), 250);
  }

  function markDirty() {
    dirty = true;
    scheduleFlush();
  }

  items = readNativeItems();
  const hasNativeItems = Object.keys(items).length > 0;
  loadRemoteItems();
  if (remoteReady && hasNativeItems) markDirty();

  const storage = {
    get length() {
      return Object.keys(items).length;
    },
    get remotePath() {
      return remotePath;
    },
    get remoteReady() {
      return remoteReady;
    },
    getItem(key) {
      key = String(key);
      return Object.prototype.hasOwnProperty.call(items, key)
        ? items[key]
        : null;
    },
    setItem(key, value) {
      key = String(key);
      if (excludedKeys.has(key)) {
        try {
          nativeStorage.setItem(key, String(value));
        } catch {
          // The dedicated RPG save API remains the EXE/server persistence path.
        }
        return;
      }
      items[key] = String(value);
      try {
        nativeStorage.setItem(key, String(value));
      } catch {
        // Remote storage still persists the value for EXE/server runs.
      }
      markDirty();
    },
    removeItem(key) {
      key = String(key);
      if (excludedKeys.has(key)) {
        try {
          nativeStorage.removeItem(key);
        } catch {
          // Ignore local fallback cleanup failures.
        }
        return;
      }
      delete items[key];
      try {
        nativeStorage.removeItem(key);
      } catch {
        // Ignore local fallback cleanup failures.
      }
      markDirty();
    },
    clear() {
      items = {};
      try {
        nativeStorage.clear();
      } catch {
        // Ignore local fallback cleanup failures.
      }
      markDirty();
    },
    key(index) {
      return Object.keys(items)[Number(index)] || null;
    },
    keys() {
      return Object.keys(items);
    },
    flush() {
      postItems(true);
    },
  };

  window.addEventListener("pagehide", () => storage.flush());
  window.goodEtcStorage = storage;
})();
