// Helper function for text-to-speech
function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

// Global variable to track if the assistant should listen for follow-up commands
let assistantActive = false;
let alarmTimeout = null;  // Track alarm timeouts

// Start the voice recognition process for commands
function startVoiceRecognition() {
  if (!assistantActive) return; // Stop if assistant is deactivated

  speak("Yes");

  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start(); // Start the recognition process

  recognition.onresult = (event) => {
    const command = event.results[0][0].transcript.toLowerCase();
    console.log(`Command heard: ${command}`);
    speak(`You said: ${command}`);

    // Command logic
    handleCommand(command);
  };

  recognition.onerror = (event) => {
    console.error("Error occurred in recognition: ", event.error);
    speak("Error occurred during recognition.");
    if (assistantActive) startVoiceRecognition(); // Restart the recognition
  };

  recognition.onend = () => {
    if (assistantActive) startVoiceRecognition(); // Restart if assistant is still active
  };
}

// Function to handle specific commands after activation
function handleCommand(command) {
  // Stop listening
  if (command.includes("stop listening")) {
    assistantActive = false;
    speak("Stopping voice assistant.");
    return;
  }

  // Open any website
  if (command.includes("open")) {
    let url = command.replace("open", "").trim();
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }
    chrome.tabs.create({ url: url });
    speak(`Opening ${url}`);
  } 
  // Play YouTube Video
  else if (command.includes("play")) {
    controlYouTubeVideo("play");
  }
  // Pause YouTube Video
  else if (command.includes("pause")) {
    controlYouTubeVideo("pause");
  }
  // Mute YouTube Video
  else if (command.includes("mute video")) {
    controlYouTubeVideo("mute");
  }
  // Unmute YouTube Video
  else if (command.includes("unmute video")) {
    controlYouTubeVideo("unmute");
  }
  // Close active tab
  else if (command.includes("close tab")) {
    closeActiveTab();
  }
  // Switch to next tab
  else if (command.includes("next tab")) {
    switchToNextTab();
  }
  // Set an alarm
  else if (command.includes("set an alarm for")) {
    let time = command.replace("set an alarm for", "").trim();
    let minutes = parseInt(time, 10);
    if (isNaN(minutes)) {
      speak("I didn't recognize the time.");
    } else {
      speak(`Setting an alarm for ${minutes} minutes.`);
      alarmTimeout = setTimeout(() => {
        speak("Time's up! Your alarm is going off.");
      }, minutes * 60000);
    }
  }
  // Stop alarm
  else if (command.includes("stop alarm")) {
    clearTimeout(alarmTimeout);
    speak("Alarm stopped.");
  }
  // Search on Google
  else if (command.includes("search for")) {
    let query = command.replace("search for", "").trim();
    let url = "https://www.google.com/search?q=" + encodeURIComponent(query);
    chrome.tabs.create({ url: url });
    speak(`Searching for ${query} on Google.`);
  }
  // Check weather
  else if (command.includes("check weather for")) {
    let city = command.replace("check weather for", "").trim();
    let url = "https://www.weather.com/weather/today/l/" + encodeURIComponent(city);
    chrome.tabs.create({ url: url });
    speak(`Checking the weather for ${city}.`);
  }
  // Open specific app (e.g., Google Docs or Gmail)
  else if (command.includes("open google docs")) {
    let url = "https://docs.google.com/";
    chrome.tabs.create({ url: url });
    speak("Opening Google Docs.");
  } else if (command.includes("open gmail")) {
    let url = "https://mail.google.com/";
    chrome.tabs.create({ url: url });
    speak("Opening Gmail.");
  }
  // Scroll down the page
  else if (command.includes("scroll down")) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => window.scrollBy(0, 500),
      });
      speak("Scrolling down.");
    });
  }
  // Scroll up the page
  else if (command.includes("scroll up")) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => window.scrollBy(0, -500),
      });
      speak("Scrolling up.");
    });
  }
  // Check the current time
  else if (command.includes("what time is it")) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const time = `${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
    speak(`The time is ${time}.`);
  }
  // Increase volume
  else if (command.includes("increase volume")) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const video = document.querySelector('video');
          if (video) {
            video.volume = Math.min(video.volume + 0.1, 1);
          }
        }
      });
      speak("Increasing volume.");
    });
  }
  // Decrease volume
  else if (command.includes("decrease volume")) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const video = document.querySelector('video');
          if (video) {
            video.volume = Math.max(video.volume - 0.1, 0);
          }
        }
      });
      speak("Decreasing volume.");
    });
  }
  // Command not recognized
  else {
    speak("Sorry, I didn't recognize that command.");
  }
}

// Helper to control YouTube video
function controlYouTubeVideo(command) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tab = tabs[0];
    if (tab && tab.url.includes("youtube.com")) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (cmd) => {
          const video = document.querySelector('video');
          if (video) {
            if (cmd === "play") video.play();
            else if (cmd === "pause") video.pause();
            else if (cmd === "mute") video.muted = true;
            else if (cmd === "unmute") video.muted = false;
          }
        },
        args: [command]
      });
    } else {
      speak("No active YouTube tab found.");
    }
  });
}

// Helper to close the active tab
function closeActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tabId = tabs[0]?.id;
    if (tabId) {
      chrome.tabs.remove(tabId);
      speak("The current tab has been closed.");
    } else {
      speak("No active tab found to close.");
    }
  });
}

// Helper to switch to next tab
function switchToNextTab() {
  chrome.tabs.query({ currentWindow: true }, function(tabs) {
    let currentTabIndex;
    tabs.forEach((tab, index) => {
      if (tab.active) currentTabIndex = index;
    });
    const nextTabIndex = (currentTabIndex + 1) % tabs.length;
    chrome.tabs.update(tabs[nextTabIndex].id, { active: true });
    speak("Switched to the next tab.");
  });
}

// Initial activation command listener
function listenForActivation() {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  recognition.start();
  
  recognition.onresult = (event) => {
    const activationCommand = event.results[0][0].transcript.toLowerCase();
    
    if (activationCommand.includes("hey assistant") || activationCommand.includes("start listening")) {
      recognition.stop();  // Stop the activation listener
      assistantActive = true;  // Activate the assistant
      startVoiceRecognition();  // Start listening for commands
    }
  };

  recognition.onerror = (event) => {
    console.error("Error in activation recognition: ", event.error);
  };

  recognition.onend = () => {
    if (!assistantActive) listenForActivation();  // Restart activation listener if not active
  };
}

// Start listening for activation commands immediately
listenForActivation();
