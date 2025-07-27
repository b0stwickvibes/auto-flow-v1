// MacroRecorder.js
// AutoFlow Macro Recorder - Enhanced Version
// This module provides cross-site recording, persistence, and UI improvements

(function() {
  // Recorder state
  let isRecording = false;
  let recordedActions = [];
  let recorderUI = null;
  let dataKey = 'autoflow_macro_data';

  // Utility: Save data to localStorage (with fallback)
  function saveData(data) {
    try {
      localStorage.setItem(dataKey, JSON.stringify(data));
    } catch (e) {
      // Fallback: Download as file
      const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'macro_data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  // Utility: Load data from localStorage
  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(dataKey)) || [];
    } catch (e) {
      return [];
    }
  }

  // Recorder UI (draggable, repositionable)
  function createRecorderUI() {
    recorderUI = document.createElement('div');
    recorderUI.id = 'autoflow-macro-ui';
    recorderUI.style.position = 'fixed';
    recorderUI.style.top = '40px';
    recorderUI.style.left = '20px';
    recorderUI.style.zIndex = '99999';
    recorderUI.style.background = '#222';
    recorderUI.style.color = '#fff';
    recorderUI.style.padding = '10px 20px';
    recorderUI.style.borderRadius = '8px';
    recorderUI.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    recorderUI.style.cursor = 'move';
    recorderUI.innerHTML = `
      <strong>AutoFlow Macro Recorder</strong><br>
      <button id="start-recording">Start</button>
      <button id="stop-recording">Stop</button>
      <button id="save-recording">Save</button>
      <button id="move-ui">Move UI</button>
    `;
    document.body.appendChild(recorderUI);

    // Drag logic
    let isDragging = false, offsetX = 0, offsetY = 0;
    recorderUI.addEventListener('mousedown', function(e) {
      isDragging = true;
      offsetX = e.clientX - recorderUI.offsetLeft;
      offsetY = e.clientY - recorderUI.offsetTop;
    });
    document.addEventListener('mousemove', function(e) {
      if (isDragging) {
        recorderUI.style.left = (e.clientX - offsetX) + 'px';
        recorderUI.style.top = (e.clientY - offsetY) + 'px';
      }
    });
    document.addEventListener('mouseup', function() {
      isDragging = false;
    });

    // Move UI button
    recorderUI.querySelector('#move-ui').onclick = function() {
      recorderUI.style.top = '80px';
      recorderUI.style.left = '0px';
      recorderUI.style.width = '100vw';
      recorderUI.style.borderRadius = '0';
      recorderUI.style.background = '#333';
    };

    // Start/Stop/Save buttons
    recorderUI.querySelector('#start-recording').onclick = startRecording;
    recorderUI.querySelector('#stop-recording').onclick = stopRecording;
    recorderUI.querySelector('#save-recording').onclick = function() {
      saveData(recordedActions);
      alert('Macro saved!');
    };
  }

  // Start recording
  function startRecording() {
    isRecording = true;
    recordedActions = [];
    window.addEventListener('click', recordAction, true);
    window.addEventListener('submit', recordAction, true);
    window.addEventListener('popstate', recordAction, true);
    window.addEventListener('hashchange', recordAction, true);
    // Persistence for popups/auth
    window.addEventListener('storage', persistRecorder, false);
  }

  // Stop recording
  function stopRecording() {
    isRecording = false;
    window.removeEventListener('click', recordAction, true);
    window.removeEventListener('submit', recordAction, true);
    window.removeEventListener('popstate', recordAction, true);
    window.removeEventListener('hashchange', recordAction, true);
    window.removeEventListener('storage', persistRecorder, false);
    saveData(recordedActions);
  }

  // Record action
  function recordAction(e) {
    if (!isRecording) return;
    recordedActions.push({
      type: e.type,
      target: e.target.tagName,
      value: e.target.value || null,
      timestamp: Date.now(),
      url: window.location.href
    });
    // Save after each action for persistence
    saveData(recordedActions);
  }

  // Persistence logic
  function persistRecorder() {
    if (!recorderUI) createRecorderUI();
  }

  // Bookmarklet reinjection
  function reinjectRecorder() {
    if (!document.getElementById('autoflow-macro-ui')) {
      createRecorderUI();
    }
  }
  window.addEventListener('DOMContentLoaded', reinjectRecorder);
  window.addEventListener('hashchange', reinjectRecorder);
  window.addEventListener('popstate', reinjectRecorder);

  // Initialize
  createRecorderUI();

  // Expose for debugging
  window.AutoFlowMacroRecorder = {
    start: startRecording,
    stop: stopRecording,
    save: function() { saveData(recordedActions); },
    load: loadData
  };
})();
