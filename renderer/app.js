// Access Electron API with enhanced type definitions
const {
  getClipboardText,
  validateUrl,
  getFormats,
  startDownload,
  cancelDownload,
  selectOutputPath,
  getOutputPath,
  getProfiles,
  saveProfile,
  deleteProfile,
  getHistory,
  clearHistory,
  openFileLocation,
  openFile,
  onProgress,
  onComplete,
  onError,
  getVideoInfo,
} = window.electronAPI;

// Application State Management
const AppState = {
  currentDownload: null,
  availableFormats: [],
  clipboardMonitor: null,
  settings: {},
  downloadQueue: [],
  currentFormat: null,
  videoInfo: null,
};

// Download state management
const DownloadState = {
  MAX_CONCURRENT: 2,
  activeDownloads: new Map(),
  queue: [],
  
  addDownload(url, options) {
    const download = { url, options, startTime: Date.now(), progress: 0 };
    if (this.activeDownloads.size < this.MAX_CONCURRENT) {
      this.activeDownloads.set(url, download);
      return true;
    }
    this.queue.push(download);
    return false;
  },

  removeDownload(url) {
    this.activeDownloads.delete(url);
    if (this.queue.length > 0 && this.activeDownloads.size < this.MAX_CONCURRENT) {
      const next = this.queue.shift();
      this.activeDownloads.set(next.url, next);
      downloadVideo(next.url, next.options);
    }
  },

  updateProgress(url, progress) {
    const download = this.activeDownloads.get(url);
    if (download) {
      download.progress = progress;
      download.lastUpdate = Date.now();
      download.speed = this.calculateSpeed(download);
      download.eta = this.calculateETA(download);
    }
  },

  calculateSpeed(download) {
    const elapsed = (Date.now() - download.lastSpeedUpdate) / 1000;
    if (elapsed > 0) {
      const progressDelta = download.progress - download.lastProgress;
      const speed = progressDelta / elapsed;
      download.lastProgress = download.progress;
      download.lastSpeedUpdate = Date.now();
      download.speeds = download.speeds || [];
      download.speeds.push(speed);
      if (download.speeds.length > 5) download.speeds.shift();
      return download.speeds.reduce((a, b) => a + b) / download.speeds.length;
    }
    return 0;
  },

  calculateETA(download) {
    if (download.speed > 0) {
      const remaining = 100 - download.progress;
      return Math.ceil(remaining / download.speed);
    }
    return 0;
  }
};

// DOM Elements
const urlInput = document.getElementById("url-input");
const pasteBtn = document.getElementById("paste-btn");
const downloadBtn = document.getElementById("download-btn");
const saveProfileBtn = document.getElementById("save-profile-btn");
const cancelDownloadBtn = document.getElementById("cancel-download-btn");
const downloadProgress = document.getElementById("download-progress");
const downloadActions = document.getElementById("download-actions");
const progressPercentage = document.getElementById("progress-percentage");
const progressBarFill = document.querySelector(".progress-bar-fill");
const fragmentProgress = document.getElementById("fragment-progress");
const downloadSpeed = document.getElementById("download-speed");
const downloadEta = document.getElementById("download-eta");
const downloadLocation = document.getElementById("download-location");
const changeLocationBtn = document.getElementById("change-location-btn");
const navItems = document.querySelectorAll(".nav-item[data-page]");
const pages = document.querySelectorAll(".page");
const themeToggle = document.getElementById("theme-toggle");
const typeOptions = document.querySelectorAll(".option-card[data-type]");
const videoQualityGroup = document.getElementById("video-quality-group");
const audioQualityGroup = document.getElementById("audio-quality-group");
const audioFormatGroup = document.getElementById("audio-format-group");
const videoQualityOptions = document.querySelectorAll(
  ".option-card[data-quality]"
);
const audioQualityOptions = document.querySelectorAll(
  ".option-card[data-audio-quality]"
);
const audioFormatOptions = document.querySelectorAll(
  ".option-card[data-audio-format]"
);
// eslint-disable-next-line no-unused-vars
const helpBtn = document.getElementById("help-btn");
const batchDownloadBtn = document.getElementById("batch-download-btn");
const batchUrlsInput = document.getElementById("batch-urls-input");

// Advanced settings elements
const advancedSettingsBtn = document.getElementById("advanced-settings-btn");
const advancedSettingsPanel = document.getElementById(
  "advanced-settings-panel"
);
const advancedSettingsClose = document.getElementById(
  "advanced-settings-close"
);
const applyAdvancedSettings = document.getElementById(
  "apply-advanced-settings"
);
const overlay = document.getElementById("overlay");
const accordions = document.querySelectorAll(".accordion");
const loadFormatsBtn = document.getElementById("load-formats-btn");
const formatSelect = document.getElementById("format-select");
const subtitleSelect = document.getElementById("subtitle-select");
const embedSubsToggle = document.getElementById("embed-subs-toggle");
const embedThumbnailToggle = document.getElementById("embed-thumbnail-toggle");
const embedMetadataToggle = document.getElementById("embed-metadata-toggle");
const playlistToggle = document.getElementById("playlist-toggle");
const playlistItemsGroup = document.getElementById("playlist-items-group");
const playlistItems = document.getElementById("playlist-items");
const outputTemplate = document.getElementById("output-template");
const mergeFormat = document.getElementById("merge-format");
// eslint-disable-next-line no-unused-vars
const cookiesFile = document.getElementById("cookies-file");
const proxy = document.getElementById("proxy");

// History elements
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const emptyHistory = document.getElementById("empty-history");
const historyTabs = document.querySelectorAll(".tab[data-category]");

// Settings elements
const defaultLocation = document.getElementById("default-location");
const defaultLocationBtn = document.getElementById("default-location-btn");
const profilesList = document.getElementById("profiles-list");
const emptyProfiles = document.getElementById("empty-profiles");
const autoPasteToggle = document.getElementById("auto-paste-toggle");
const autoDownloadToggle = document.getElementById("auto-download-toggle");
const monitorClipboardToggle = document.getElementById(
  "monitor-clipboard-toggle"
);
window.appInfo.onVersion((version) => {
  document.getElementById("version").textContent = version;
});

// Application state
let currentType = "video";
let currentVideoQuality = "best";
let currentAudioQuality = "best";
let currentAudioFormat = "mp3";
let downloadInProgress = false;
let clipboardMonitorInterval = null;
// eslint-disable-next-line no-unused-vars
let availableFormats = [];
let advancedSettingsData = {
  format: null,
  subtitles: "none",
  embedSubs: false,
  embedThumbnail: true,
  embedMetadata: true,
  playlist: false,
  playlistItems: "",
  outputTemplate: "%(title)s.%(ext)s",
  mergeFormat: "mp4",
  cookiesFile: "",
  proxy: "",
};

// Keyboard shortcuts
const KEYBOARD_SHORTCUTS = {
  "Ctrl+V": "Paste URL",
  "Ctrl+Enter": "Start Download",
  Escape: "Cancel Download/Close Panel",
  "Ctrl+S": "Save Profile",
  "Ctrl+F": "Load Formats",
  "Ctrl+1": "Download Tab",
  "Ctrl+2": "History Tab",
  "Ctrl+3": "Settings Tab",
};

// Register event listeners for help/shortcuts
function registerHelpEventListeners() {
  const helpBtn = document.getElementById("help-btn");
  const helpToggle = document.getElementById("help-toggle");
  const keyboardShortcuts = document.getElementById("keyboard-shortcuts");
  const keyboardShortcutsClose = document.getElementById(
    "keyboard-shortcuts-close"
  );
  const keyboardShortcutsList = document.getElementById(
    "keyboard-shortcuts-list"
  );

  // Populate shortcuts list
  for (const [key, description] of Object.entries(KEYBOARD_SHORTCUTS)) {
    const shortcutItem = document.createElement("div");
    shortcutItem.className = "keyboard-shortcut-item";
    shortcutItem.innerHTML = `
            <div>${description}</div>
            <div class="keyboard-shortcut-key">${key}</div>
        `;
    keyboardShortcutsList.appendChild(shortcutItem);
  }

  // Show shortcuts panel
  function showShortcuts() {
    keyboardShortcuts.classList.add("active");
  }

  // Hide shortcuts panel
  function hideShortcuts() {
    keyboardShortcuts.classList.remove("active");
  }

  // Event listeners
  helpBtn.addEventListener("click", showShortcuts);
  if (helpToggle) {
    helpToggle.addEventListener("click", showShortcuts);
  }
  keyboardShortcutsClose.addEventListener("click", hideShortcuts);
}

// Handle drag and drop for URL input
function setupDragAndDrop() {
  const dragDropZone = document.getElementById("drag-drop-zone");

  dragDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDropZone.classList.add("active");
  });

  dragDropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDropZone.classList.remove("active");
  });

  dragDropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDropZone.classList.remove("active");

    const text = e.dataTransfer.getData("text");
    if (text && await validateUrl(text)) {
      urlInput.value = text;
      downloadBtn.disabled = false;
      loadFormatsBtn.disabled = false;
      showToast("URL dropped successfully", "success");

      if (autoDownloadToggle.checked) {
        downloadVideo();
      }
    } else {
      showToast("Dropped content is not a valid URL", "error");
    }
  });
}

// Initialize app
async function init() {
  // Load output path
  const outputPath = await getOutputPath();
  downloadLocation.textContent = outputPath.path;
  defaultLocation.textContent = outputPath.path;

  // Initialize state
  AppState.settings = loadSettings();
  
  // Load history and profiles
  await Promise.all([
    loadHistoryList(),
    loadProfilesList()
  ]);

  // Apply app version
  window.appInfo.onVersion((version) => {
    document.getElementById("version").textContent = version;
  });

  // Apply dark mode if needed
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    themeToggle.querySelector("span:last-child").textContent = "Light Mode";
    themeToggle.querySelector(".material-icons").textContent = "light_mode";
  }

  // Check for clipboard content on startup
  if (autoPasteToggle.checked) {
    handlePaste();
  }

  // Start clipboard monitoring if enabled
  if (monitorClipboardToggle.checked) {
    startClipboardMonitor();
  }

  // Register event listeners
  registerEventListeners();

  // Register help event listeners
  registerHelpEventListeners();

  // Setup drag and drop
  setupDragAndDrop();
}

// Load settings from localStorage
function loadSettings() {
  autoPasteToggle.checked = localStorage.getItem("autoPaste") === "true";
  autoDownloadToggle.checked = localStorage.getItem("autoDownload") === "true";
  monitorClipboardToggle.checked =
    localStorage.getItem("monitorClipboard") === "true";

  // Load advanced settings
  advancedSettingsData.subtitles = localStorage.getItem("subtitles") || "none";
  advancedSettingsData.embedSubs = localStorage.getItem("embedSubs") === "true";
  advancedSettingsData.embedThumbnail =
    localStorage.getItem("embedThumbnail") !== "false";
  advancedSettingsData.embedMetadata =
    localStorage.getItem("embedMetadata") !== "false";
  advancedSettingsData.playlist = localStorage.getItem("playlist") === "true";
  advancedSettingsData.playlistItems =
    localStorage.getItem("playlistItems") || "";
  advancedSettingsData.outputTemplate =
    localStorage.getItem("outputTemplate") || "%(title)s.%(ext)s";
  advancedSettingsData.mergeFormat =
    localStorage.getItem("mergeFormat") || "mp4";
  advancedSettingsData.proxy = localStorage.getItem("proxy") || "";

  // Update UI with settings
  subtitleSelect.value = advancedSettingsData.subtitles;
  embedSubsToggle.checked = advancedSettingsData.embedSubs;
  embedThumbnailToggle.checked = advancedSettingsData.embedThumbnail;
  embedMetadataToggle.checked = advancedSettingsData.embedMetadata;
  playlistToggle.checked = advancedSettingsData.playlist;
  playlistItems.value = advancedSettingsData.playlistItems;
  outputTemplate.value = advancedSettingsData.outputTemplate;
  mergeFormat.value = advancedSettingsData.mergeFormat;
  proxy.value = advancedSettingsData.proxy;

  // Show/hide playlist items based on toggle
  playlistItemsGroup.style.display = advancedSettingsData.playlist
    ? "block"
    : "none";
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem("autoPaste", autoPasteToggle.checked);
  localStorage.setItem("autoDownload", autoDownloadToggle.checked);
  localStorage.setItem("monitorClipboard", monitorClipboardToggle.checked);

  // Save advanced settings
  localStorage.setItem("subtitles", advancedSettingsData.subtitles);
  localStorage.setItem("embedSubs", advancedSettingsData.embedSubs);
  localStorage.setItem("embedThumbnail", advancedSettingsData.embedThumbnail);
  localStorage.setItem("embedMetadata", advancedSettingsData.embedMetadata);
  localStorage.setItem("playlist", advancedSettingsData.playlist);
  localStorage.setItem("playlistItems", advancedSettingsData.playlistItems);
  localStorage.setItem("outputTemplate", advancedSettingsData.outputTemplate);
  localStorage.setItem("mergeFormat", advancedSettingsData.mergeFormat);
  localStorage.setItem("proxy", advancedSettingsData.proxy);
}

// Register all event listeners
function registerEventListeners() {
  // URL input change
  urlInput.addEventListener("input", async () => {
    const url = urlInput.value.trim();
    const isValidResponse = await validateUrl(url);
    const isValid = isValidResponse.isValid;
    downloadBtn.disabled = !isValid;
    loadFormatsBtn.disabled = !isValid;

    if (isValid && autoDownloadToggle.checked) {
      downloadVideo();
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Ctrl+V - Paste URL
    if (e.ctrlKey && e.key === "v" && document.activeElement !== urlInput) {
      e.preventDefault();
      handlePaste();
    }

    // Ctrl+Enter - Start Download
    if (
      e.ctrlKey &&
      e.key === "Enter" &&
      !downloadBtn.disabled &&
      !downloadInProgress
    ) {
      e.preventDefault();
      downloadVideo();
    }

    // Escape - Cancel Download or Close Panel
    if (e.key === "Escape") {
      if (downloadInProgress) {
        cancelDownload();
        showToast("Download cancelled", "info");
        resetDownloadUI();
      } else if (advancedSettingsPanel.classList.contains("open")) {
        advancedSettingsPanel.classList.remove("open");
        overlay.classList.remove("active");
      }
    }

    // Ctrl+S - Save Profile
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      saveProfileBtn.click();
    }

    // Ctrl+F - Load Formats
    if (e.ctrlKey && e.key === "f" && !loadFormatsBtn.disabled) {
      e.preventDefault();
      loadFormatsBtn.click();
    }

    // Ctrl+1,2,3 - Navigation
    if (e.ctrlKey && e.key >= "1" && e.key <= "3") {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      if (navItems[index]) {
        navItems[index].click();
      }
    }
  });

  // Drag and drop support for URL input
  document.getElementById("download-page").addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.getElementById("download-page").addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const text = e.dataTransfer.getData("text");
    if (text && await validateUrl(text)) {
      urlInput.value = text;
      downloadBtn.disabled = false;
      loadFormatsBtn.disabled = false;
      showToast("URL dropped successfully", "success");

      if (autoDownloadToggle.checked) {
        downloadVideo();
      }
    } else {
      showToast("Dropped content is not a valid URL", "error");
    }
  });

  // Paste button
  pasteBtn.addEventListener("click", handlePaste);

  // Download button
  downloadBtn.addEventListener("click", downloadVideo);

  // Cancel download button
  cancelDownloadBtn.addEventListener("click", () => {
    cancelDownload();
    showToast("Download cancelled", "info");
    resetDownloadUI();
  });

  // Batch download button
  batchDownloadBtn.addEventListener("click", processBatchDownload);

  // Update button selection logic for type options
  typeOptions.forEach((option) => {
    option.addEventListener("click", () => {
      // Remove selected class from all options
      typeOptions.forEach((opt) => opt.classList.remove("selected"));

      // Add selected class to the clicked option
      option.classList.add("selected");

      // Update current type
      currentType = option.dataset.type;

      // Update UI based on type
      if (currentType === "video") {
        videoQualityGroup.classList.remove("hidden");
        audioQualityGroup.classList.add("hidden");
        audioFormatGroup.classList.add("hidden");
      } else {
        videoQualityGroup.classList.add("hidden");
        audioQualityGroup.classList.remove("hidden");
        audioFormatGroup.classList.remove("hidden");
      }
    });
  });

  // Update button selection logic for video quality options
  videoQualityOptions.forEach((option) => {
    option.addEventListener("click", () => {
      videoQualityOptions.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
      currentVideoQuality = option.dataset.quality;
    });
  });

  // Update button selection logic for audio quality options
  audioQualityOptions.forEach((option) => {
    option.addEventListener("click", () => {
      audioQualityOptions.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
      currentAudioQuality = option.dataset.audioQuality;
    });
  });

  // Update button selection logic for audio format options
  audioFormatOptions.forEach((option) => {
    option.addEventListener("click", () => {
      audioFormatOptions.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
      currentAudioFormat = option.dataset.audioFormat;
    });
  });

  // Change download location
  changeLocationBtn.addEventListener("click", async () => {
    const path = await selectOutputPath();
    if (path) {
      downloadLocation.textContent = path;
      showToast("Download location updated", "success");
    }
  });

  // Default location change
  defaultLocationBtn.addEventListener("click", async () => {
    const path = await selectOutputPath();
    if (path) {
      defaultLocation.textContent = path;
      downloadLocation.textContent = path;
      showToast("Default location updated", "success");
    }
  });

  // Navigation
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetPage = item.dataset.page;

      // Update active states
      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      pages.forEach((page) => page.classList.remove("active"));
      document.getElementById(`${targetPage}-page`).classList.add("active");

      // Load data if needed
      if (targetPage === "history") {
        loadHistoryList();
      } else if (targetPage === "settings") {
        loadProfilesList();
      }
    });
  });

  // Theme toggle
  themeToggle.addEventListener("click", () => {
    const isDarkMode = document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", isDarkMode);

    if (isDarkMode) {
      themeToggle.querySelector("span:last-child").textContent = "Light Mode";
      themeToggle.querySelector(".material-icons").textContent = "light_mode";
    } else {
      themeToggle.querySelector("span:last-child").textContent = "Dark Mode";
      themeToggle.querySelector(".material-icons").textContent = "dark_mode";
    }
  });

  // Advanced settings button
  advancedSettingsBtn.addEventListener("click", () => {
    advancedSettingsPanel.classList.add("open");
    overlay.classList.add("active");
  });

  // Close advanced settings
  advancedSettingsClose.addEventListener("click", () => {
    advancedSettingsPanel.classList.remove("open");
    overlay.classList.remove("active");
  });

  // Click on overlay
  overlay.addEventListener("click", () => {
    advancedSettingsPanel.classList.remove("open");
    overlay.classList.remove("active");
  });

  // Accordions
  accordions.forEach((accordion) => {
    const header = accordion.querySelector(".accordion-header");
    header.addEventListener("click", () => {
      accordion.classList.toggle("open");
    });
  });

  // Load formats button
  loadFormatsBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) return;

    try {
      formatSelect.disabled = true;
      formatSelect.innerHTML = '<option value="">Loading formats...</option>';

      const formats = await getFormats(url);
      availableFormats = formats;

      formatSelect.innerHTML = '<option value="">Select a format</option>';
      formats.forEach((format) => {
        const option = document.createElement("option");
        option.value = format.formatId;
        option.textContent = `${format.formatId}: ${format.type} - ${
          format.resolution || "N/A"
        } - ${format.filesize || "N/A"}`;
        formatSelect.appendChild(option);
      });

      formatSelect.disabled = false;
      showToast("Formats loaded successfully", "success");
    } catch (error) {
      showToast("Failed to load formats: " + error, "error");
      formatSelect.innerHTML =
        '<option value="">Failed to load formats</option>';
    }
  });

  // Apply advanced settings
  applyAdvancedSettings.addEventListener("click", () => {
    // Update advanced settings data
    advancedSettingsData.format = formatSelect.value || null;
    advancedSettingsData.subtitles = subtitleSelect.value;
    advancedSettingsData.embedSubs = embedSubsToggle.checked;
    advancedSettingsData.embedThumbnail = embedThumbnailToggle.checked;
    advancedSettingsData.embedMetadata = embedMetadataToggle.checked;
    advancedSettingsData.playlist = playlistToggle.checked;
    advancedSettingsData.playlistItems = playlistItems.value;
    advancedSettingsData.outputTemplate = outputTemplate.value;
    advancedSettingsData.mergeFormat = mergeFormat.value;
    advancedSettingsData.proxy = proxy.value;

    // Save settings
    saveSettings();

    // Close panel
    advancedSettingsPanel.classList.remove("open");
    overlay.classList.remove("active");

    showToast("Advanced settings applied", "success");
  });

  // Playlist toggle
  playlistToggle.addEventListener("change", () => {
    playlistItemsGroup.style.display = playlistToggle.checked
      ? "block"
      : "none";
  });

  // Save profile button
  saveProfileBtn.addEventListener("click", () => {
    const profileName = prompt("Enter a name for this profile:");
    if (!profileName) return;

    const options = {
      type: currentType,
      videoQuality: currentVideoQuality,
      audioQuality: currentAudioQuality,
      audioFormat: currentAudioFormat,
      ...advancedSettingsData,
    };

    saveProfile(profileName, options).then(() => {
      showToast(`Profile "${profileName}" saved`, "success");
    });
  });

  // Clear history button
  clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your download history?")) {
      clearHistory().then(() => {
        loadHistoryList();
        showToast("History cleared", "success");
      });
    }
  });

  // History tabs
  historyTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      historyTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      loadHistoryList(tab.dataset.category);
    });
  });

  // Settings toggles
  autoPasteToggle.addEventListener("change", () => {
    localStorage.setItem("autoPaste", autoPasteToggle.checked);
  });

  autoDownloadToggle.addEventListener("change", () => {
    localStorage.setItem("autoDownload", autoDownloadToggle.checked);
  });

  monitorClipboardToggle.addEventListener("change", () => {
    localStorage.setItem("monitorClipboard", monitorClipboardToggle.checked);

    if (monitorClipboardToggle.checked) {
      startClipboardMonitor();
    } else {
      stopClipboardMonitor();
    }
  });

  // Register IPC event listeners
  onProgress((progress) => {
    updateProgressUI(progress);
  });

  onComplete(() => {
    progressBarFill.style.width = "100%";
    progressPercentage.textContent = "100%";
    showToast("Download completed successfully", "success");

    setTimeout(() => {
      resetDownloadUI();
      processNextInQueue();
    }, 2000);
  });

  onError((error) => {
    console.log(error)
    const message = typeof error === "string" ? error
                 : error?.message || JSON.stringify(error);
  showToast("Download error: " + message, "error");
  resetDownloadUI();

    // Check if there are more URLs in the batch and continue despite error
    const remainingUrls = batchUrlsInput.value
      .trim()
      .split("\n")
      .filter(async (url) => url.trim() !== "" && await validateUrl(url.trim()));
    if (remainingUrls.length > 0) {
      urlInput.value = remainingUrls[0];
      batchUrlsInput.value = remainingUrls.slice(1).join("\n");

      showToast(
        `Continuing batch despite error: ${remainingUrls.length + 1} remaining`,
        "warning"
      );

      // Longer delay before starting next download after error
      setTimeout(() => {
        downloadVideo();
      }, 3000);
    }
  });
}

// Handle paste from clipboard
async function handlePaste() {
  try {
    const response = await getClipboardText();
    const text = response.text;
    console.log(text);
    
    const isValid = await validateUrl(text);
    console.log(isValid);

    if (isValid.isValid) {
      urlInput.value = text;
      downloadBtn.disabled = false;
      loadFormatsBtn.disabled = false;
      showToast("URL pasted from clipboard", "success");

      if (autoDownloadToggle.checked) {
        downloadVideo();
      }
    } else {
      showToast("Clipboard content is not a valid URL", "error");
    }
  } catch (error) {
    showToast("Failed to read clipboard: " + error, "error");
  }
}

// Start download
async function downloadVideo(url = urlInput.value.trim(), options = null) {
  if (!url || downloadInProgress) return;

  // Validate URL and check info before starting
  try {
    const info = await getVideoInfo(url);
    AppState.videoInfo = info;
    
    if (info.isPlaylist && !advancedSettingsData.playlist) {
      if (confirm("This URL contains a playlist. Do you want to enable playlist download?")) {
        advancedSettingsData.playlist = true;
        playlistToggle.checked = true;
        playlistItemsGroup.style.display = "block";
      }
    }

    urlInput.value = "";
    downloadInProgress = true;
    downloadProgress.classList.remove("hidden");
    downloadActions.classList.add("hidden");

    // Build enhanced options
    const downloadOptions = options || {
      url,
      type: currentType,
      videoInfo: info,
      videoQuality: currentType === "video" ? currentVideoQuality : undefined,
      audioQuality: currentType === "audio" ? currentAudioQuality : undefined,
      audioFormat: currentType === "audio" ? currentAudioFormat : undefined,
      ...advancedSettingsData
    };

    AppState.currentDownload = {
      url,
      options: downloadOptions,
      startTime: Date.now()
    };

    if (DownloadState.addDownload(url, downloadOptions)) {
      // Start download
      startDownload(downloadOptions);
    } else {
      showToast("Download added to queue", "info");
    }
  } catch (error) {
    showToast(`Failed to prepare download: ${error.message}`, "error");
  }
}

// Enhanced batch download handling
function processBatchDownload() {
  const urls = batchUrlsInput.value
    .trim()
    .split("\n")
    .filter(url => url.trim() !== "");

  if (urls.length === 0) {
    showToast("Please enter at least one URL", "error");
    return;
  }

  // Filter valid URLs and warn about invalid ones
  const validUrls = urls.filter(async url => await validateUrl(url.trim()));
  const invalidCount = urls.length - validUrls.length;

  if (invalidCount > 0) {
    showToast(`Warning: ${invalidCount} invalid URLs will be skipped`, "warning");
  }

  if (validUrls.length === 0) {
    showToast("No valid URLs to download", "error");
    return;
  }

  // Add URLs to download queue
  AppState.downloadQueue = validUrls;
  showToast(`Starting batch download: ${validUrls.length} items`, "info");

  // Start first download
  processNextInQueue();
}

function processNextInQueue() {
  if (AppState.downloadQueue.length === 0 || downloadInProgress) {
    if (AppState.downloadQueue.length === 0) {
      showToast("Batch download completed!", "success");
    }
    return;
  }

  const nextUrl = AppState.downloadQueue.shift();
  urlInput.value = nextUrl;
  downloadVideo();
}

// Update progress UI
function updateProgressUI(progress) {
  if (!downloadInProgress) return;

  // Round to 2 decimal places for smoother display
  const percent = Math.round(progress.percent * 100) / 100;
  progressPercentage.textContent = `${percent}%`;
  progressBarFill.style.width = `${percent}%`;

  // Show fragment progress for segmented downloads
  if (progress.totalFragments > 0) {
    const fragmentPercent = (progress.currentFragment / progress.totalFragments) * 100;
    fragmentProgress.textContent = `Fragment: ${progress.currentFragment}/${progress.totalFragments} (${Math.round(fragmentPercent)}%)`;
  } else {
    fragmentProgress.textContent = progress.stage || "Downloading...";
  }

  // Parse and format speed display
  if (progress.speed) {
    const speedNum = parseFloat(progress.speed);
    if (!isNaN(speedNum)) {
      const formattedSpeed = speedNum >= 1024 
        ? `${(speedNum/1024).toFixed(1)} MB/s`
        : `${speedNum.toFixed(1)} KB/s`;
      downloadSpeed.textContent = `Speed: ${formattedSpeed}`;
    }
  }

  // Format and display ETA
  if (progress.eta) {
    const etaMinutes = Math.floor(progress.eta / 60);
    const etaSeconds = progress.eta % 60;
    downloadEta.textContent = `ETA: ${etaMinutes}m ${etaSeconds}s`;
  }

  // Update document title with progress
  document.title = `${percent}% - Mihari Download`;

  // Update state management
  if (AppState.currentDownload) {
    DownloadState.updateProgress(AppState.currentDownload.url, percent);
  }
}

// Reset download UI
function resetDownloadUI() {
  downloadInProgress = false;
  downloadProgress.classList.add("hidden");
  downloadActions.classList.remove("hidden");
  progressBarFill.style.width = "0%";
  progressPercentage.textContent = "0%";
  fragmentProgress.textContent = "Fragment: N/A";
  downloadSpeed.textContent = "Speed: N/A";
  downloadEta.textContent = "ETA: N/A";
}

// Show a toast notification with enhanced error handling and better visual feedback
function showToast(message, type = "info") {
  console.log("Toast:", message, type);
  const iconMap = {
    success: "check_circle",
    error: "error",
    warning: "warning",
    info: "info",
  };

  const icon = iconMap[type] || "info";

  // eslint-disable-next-line no-undef
  Toastify({
    text: `<div class="d-flex align-center gap-md">
                <span class="material-icons">${icon}</span>
                <span>${message}</span>
              </div>`,
    duration: 3000,
    gravity: "bottom",
    position: "right",
    className: `toast-${type}`,
    escapeMarkup: false,
  }).showToast();
}

// Load history list
async function loadHistoryList(category = "all") {
  try {
    const res = await getHistory();
    const history = (res && Array.isArray(res.history)) ? res.history : [];

    if (history.length === 0) {
      emptyHistory.classList.remove("hidden");
      historyList.innerHTML = "";
      return;
    }

    emptyHistory.classList.add("hidden");

    // Filter by category if needed
    const filteredHistory =
      category === "all"
        ? history
        : history.filter((item) => item.type === category);

    historyList.innerHTML = "";

    (filteredHistory || []).forEach((item) => {
      const date = new Date(item.date);
      const formattedDate =
        date.toLocaleDateString() + " " + date.toLocaleTimeString();

      const historyItem = document.createElement("div");
      historyItem.className = "history-item";

      historyItem.innerHTML = `
                <div class="history-item-details">
                    <div class="history-item-title">${
                      item.filename || "Unknown"
                    }</div>
                    <div class="history-item-meta">
                        <span>
                            <span class="material-icons text-sm">${
                              item.type === "video" ? "videocam" : "audiotrack"
                            }</span>
                            ${item.type}
                        </span>
                        <span>
                            <span class="material-icons text-sm">high_quality</span>
                            ${item.quality}
                        </span>
                        <span>
                            <span class="material-icons text-sm">schedule</span>
                            ${formattedDate}
                        </span>
                    </div>
                </div>
                <div class="history-item-actions">
                    ${
                      item.filePath
                        ? `
                    <button class="btn btn-text tooltip" data-tooltip="Open file" data-path="${item.filePath}">
                        <span class="material-icons">play_arrow</span>
                    </button>
                    <button class="btn btn-text tooltip" data-tooltip="Show in folder" data-folder="${item.filePath}">
                        <span class="material-icons">folder_open</span>
                    </button>
                    `
                        : ""
                    }
                    <button class="btn btn-text tooltip" data-tooltip="Re-download" data-url="${
                      item.url
                    }">
                        <span class="material-icons">refresh</span>
                    </button>
                </div>
            `;

      // Add click event listeners
      const openFileBtn = historyItem.querySelector("[data-path]");
      if (openFileBtn) {
        openFileBtn.addEventListener("click", () => {
          openFile(openFileBtn.dataset.path).then((success) => {
            if (!success) {
              showToast(
                "Failed to open file. It may have been moved or deleted.",
                "error"
              );
            }
          });
        });
      }

      const openFolderBtn = historyItem.querySelector("[data-folder]");
      if (openFolderBtn) {
        openFolderBtn.addEventListener("click", () => {
          const folderPath = openFolderBtn.dataset.folder;
          openFileLocation(folderPath).then((success) => {
            if (!success) {
              showToast("Failed to open folder", "error");
            }
          });
        });
      }

      const redownloadBtn = historyItem.querySelector("[data-url]");
      redownloadBtn.addEventListener("click", () => {
        urlInput.value = redownloadBtn.dataset.url;
        // Switch to download page
        document.querySelector('.nav-item[data-page="download"]').click();
        // Enable download button
        downloadBtn.disabled = false;
        loadFormatsBtn.disabled = false;
      });

      historyList.appendChild(historyItem);
    });
  } catch (error) {
    showToast("Failed to load history: " + error, "error");
  }
}

// Load profiles list
async function loadProfilesList() {
  try {
    const res = await getProfiles();
    const profiles = (res && Array.isArray(res.profiles)) ? res.profiles : [];

    if (profiles.length === 0) {
      emptyProfiles.classList.remove("hidden");
      profilesList.innerHTML = "";
      return;
    }

    emptyProfiles.classList.add("hidden");
    profilesList.innerHTML = "";

    (profiles || []).forEach((profile) => {
      const profileItem = document.createElement("div");
      profileItem.className = "history-item";

      const typeIcon =
        profile.options.type === "video" ? "videocam" : "audiotrack";
      const qualityText =
        profile.options.type === "video"
          ? profile.options.videoQuality
          : `${profile.options.audioQuality} ${profile.options.audioFormat}`;

      profileItem.innerHTML = `
                <div class="history-item-details">
                    <div class="history-item-title">${profile.name}</div>
                    <div class="history-item-meta">
                        <span>
                            <span class="material-icons text-sm">${typeIcon}</span>
                            ${profile.options.type}
                        </span>
                        <span>
                            <span class="material-icons text-sm">high_quality</span>
                            ${qualityText}
                        </span>
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="btn btn-text tooltip" data-tooltip="Load profile" data-profile-load="${profile.name}">
                        <span class="material-icons">launch</span>
                    </button>
                    <button class="btn btn-text tooltip" data-tooltip="Delete profile" data-profile-delete="${profile.name}">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            `;

      // Add click event listeners
      const loadProfileBtn = profileItem.querySelector("[data-profile-load]");
      loadProfileBtn.addEventListener("click", () => {
        loadProfile(profile);
      });

      const deleteProfileBtn = profileItem.querySelector(
        "[data-profile-delete]"
      );
      deleteProfileBtn.addEventListener("click", () => {
        if (
          confirm(
            `Are you sure you want to delete the profile "${profile.name}"?`
          )
        ) {
          deleteProfile(profile.name).then(() => {
            loadProfilesList();
            showToast(`Profile "${profile.name}" deleted`, "success");
          });
        }
      });

      profilesList.appendChild(profileItem);
    });
  } catch (error) {
    showToast("Failed to load profiles: " + error, "error");
  }
}

// Load a profile
function loadProfile(profile) {
  // Set content type
  currentType = profile.options.type;
  const typeOption = document.querySelector(
    `.option-card[data-type="${currentType}"]`
  );
  if (typeOption) {
    typeOptions.forEach((opt) => opt.classList.remove("selected"));
    typeOption.classList.add("selected");
  }

  // Update UI based on type
  if (currentType === "video") {
    videoQualityGroup.classList.remove("hidden");
    audioQualityGroup.classList.add("hidden");
    audioFormatGroup.classList.add("hidden");

    // Set video quality
    currentVideoQuality = profile.options.videoQuality || "best";
    const qualityOption = document.querySelector(
      `.option-card[data-quality="${currentVideoQuality}"]`
    );
    if (qualityOption) {
      videoQualityOptions.forEach((opt) => opt.classList.remove("selected"));
      qualityOption.classList.add("selected");
    }
  } else {
    videoQualityGroup.classList.add("hidden");
    audioQualityGroup.classList.remove("hidden");
    audioFormatGroup.classList.remove("hidden");

    // Set audio quality
    currentAudioQuality = profile.options.audioQuality || "best";
    const audioQualityOption = document.querySelector(
      `.option-card[data-audio-quality="${currentAudioQuality}"]`
    );
    if (audioQualityOption) {
      audioQualityOptions.forEach((opt) => opt.classList.remove("selected"));
      audioQualityOption.classList.add("selected");
    }

    // Set audio format
    currentAudioFormat = profile.options.audioFormat || "mp3";
    const audioFormatOption = document.querySelector(
      `.option-card[data-audio-format="${currentAudioFormat}"]`
    );
    if (audioFormatOption) {
      audioFormatOptions.forEach((opt) => opt.classList.remove("selected"));
      audioFormatOption.classList.add("selected");
    }
  }

  // Set advanced options
  advancedSettingsData = {
    format: profile.options.format || null,
    subtitles: profile.options.subtitles || "none",
    embedSubs: profile.options.embedSubs || false,
    embedThumbnail:
      profile.options.embedThumbnail !== undefined
        ? profile.options.embedThumbnail
        : true,
    embedMetadata:
      profile.options.embedMetadata !== undefined
        ? profile.options.embedMetadata
        : true,
    playlist: profile.options.playlist || false,
    playlistItems: profile.options.playlistItems || "",
    outputTemplate: profile.options.outputTemplate || "%(title)s.%(ext)s",
    mergeFormat: profile.options.mergeFormat || "mp4",
    cookiesFile: profile.options.cookiesFile || "",
    proxy: profile.options.proxy || "",
  };

  // Update advanced settings UI
  subtitleSelect.value = advancedSettingsData.subtitles;
  embedSubsToggle.checked = advancedSettingsData.embedSubs;
  embedThumbnailToggle.checked = advancedSettingsData.embedThumbnail;
  embedMetadataToggle.checked = advancedSettingsData.embedMetadata;
  playlistToggle.checked = advancedSettingsData.playlist;
  playlistItems.value = advancedSettingsData.playlistItems;
  playlistItemsGroup.style.display = advancedSettingsData.playlist
    ? "block"
    : "none";
  outputTemplate.value = advancedSettingsData.outputTemplate;
  mergeFormat.value = advancedSettingsData.mergeFormat;
  proxy.value = advancedSettingsData.proxy;

  // Switch to download page
  document.querySelector('.nav-item[data-page="download"]').click();

  showToast(`Profile "${profile.name}" loaded`, "success");
}

// Start clipboard monitor
function startClipboardMonitor() {
  if (clipboardMonitorInterval) return;

  let lastClipboardContent = "";
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;

  clipboardMonitorInterval = setInterval(async () => {
    try {
      const clipboardContent = await getClipboardText();
      consecutiveErrors = 0; // Reset error counter on success

      // Check if content changed and is a valid URL
      if (
        clipboardContent !== lastClipboardContent &&
        await validateUrl(clipboardContent)
      ) {
        lastClipboardContent = clipboardContent;

        // Show notification
        showToast("Valid URL detected in clipboard", "info");

        // If we're on the download page, paste the URL
        if (
          document.getElementById("download-page").classList.contains("active")
        ) {
          urlInput.value = clipboardContent;
          downloadBtn.disabled = false;
          loadFormatsBtn.disabled = false;

          if (autoDownloadToggle.checked) {
            downloadVideo();
          }
        }
      }
    } catch (error) {
      console.error("Clipboard monitor error:", error);
      consecutiveErrors++;

      // Stop monitoring if too many consecutive errors
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        showToast(
          "Clipboard monitoring stopped due to repeated errors",
          "error"
        );
        stopClipboardMonitor();
        monitorClipboardToggle.checked = false;
        localStorage.setItem("monitorClipboard", false);
      }
    }
  }, 1500); // Check every 1.5 seconds
}

// Stop clipboard monitor
function stopClipboardMonitor() {
  if (clipboardMonitorInterval) {
    clearInterval(clipboardMonitorInterval);
    clipboardMonitorInterval = null;
  }
}

// Initialize the app
init();
