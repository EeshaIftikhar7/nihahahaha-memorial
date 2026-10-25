
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-GGAkCwQzfmmFfhHhgHe9kqlXNFc-ilo",
  authDomain: "nihahaha-memorial.firebaseapp.com",
  projectId: "nihahaha-memorial",
  storageBucket: "nihahaha-memorial.firebasestorage.app",
  messagingSenderId: "579027914898",
  appId: "1:579027914898:web:b00d7cbf8ddb5b6500964b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const lettersCollection = collection(db, "letters");

// Navigation
const homeView = document.getElementById("homeView");
const aboutView = document.getElementById("aboutView");
const starsTab = document.getElementById("starsTab");
const aboutTab = document.getElementById("aboutTab");
const homeLogo = document.getElementById("homeLogo");

function showView(viewName) {
  const showStars = viewName === "stars";

  homeView.hidden = !showStars;
  aboutView.hidden = showStars;

  homeView.classList.toggle("active-view", showStars);
  aboutView.classList.toggle("active-view", !showStars);

  starsTab.classList.toggle("active", showStars);
  aboutTab.classList.toggle("active", !showStars);

  if (showStars) {
    starsTab.setAttribute("aria-current", "page");
    aboutTab.removeAttribute("aria-current");
  } else {
    aboutTab.setAttribute("aria-current", "page");
    starsTab.removeAttribute("aria-current");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

starsTab.addEventListener("click", () => showView("stars"));
aboutTab.addEventListener("click", () => showView("about"));
homeLogo.addEventListener("click", (event) => {
  event.preventDefault();
  showView("stars");
});

// Letter form and dialogs
const writeLetterButton = document.getElementById("writeLetterButton");
const aboutWriteButton = document.getElementById("aboutWriteButton");
const letterDialog = document.getElementById("letterDialog");
const readDialog = document.getElementById("readDialog");

const closeWrite = document.getElementById("closeWrite");
const cancelWrite = document.getElementById("cancelWrite");
const closeRead = document.getElementById("closeRead");
const closeReadBottom = document.getElementById("closeReadBottom");

const letterForm = document.getElementById("letterForm");
const letterMessage = document.getElementById("letterMessage");
const senderName = document.getElementById("senderName");
const anonymousToggle = document.getElementById("anonymousToggle");
const sendButton = document.getElementById("sendButton");
const formStatus = document.getElementById("formStatus");
const characterCount = document.getElementById("characterCount");

const starLayer = document.getElementById("starLayer");
const skyLoading = document.getElementById("skyLoading");
const emptySky = document.getElementById("emptySky");
const letterCount = document.getElementById("letterCount");
const starLabel = document.getElementById("starLabel");

const readLetterText = document.getElementById("readLetterText");
const readLetterSignature = document.getElementById("readLetterSignature");

let lettersById = new Map();
let firstSnapshotReceived = false;
let sendingLetter = false;

function openWriteDialog() {
  setFormStatus("");
  letterDialog.showModal();
  window.setTimeout(() => letterMessage.focus(), 50);
}

writeLetterButton.addEventListener("click", openWriteDialog);
aboutWriteButton.addEventListener("click", openWriteDialog);

closeWrite.addEventListener("click", () => letterDialog.close());
cancelWrite.addEventListener("click", () => letterDialog.close());
closeRead.addEventListener("click", () => readDialog.close());
closeReadBottom.addEventListener("click", () => readDialog.close());

for (const dialog of [letterDialog, readDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

letterMessage.addEventListener("input", () => {
  characterCount.textContent = `${letterMessage.value.length} / 3000`;
});

anonymousToggle.addEventListener("change", () => {
  senderName.disabled = anonymousToggle.checked;

  if (anonymousToggle.checked) {
    senderName.value = "";
  }
});

function setFormStatus(message, type = "") {
  formStatus.textContent = message;
  formStatus.className = "form-status";
  if (type) formStatus.classList.add(type);
}

// Give each letter a repeatable star position based on its document ID.
function hashString(value) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededNumber(seed, offset) {
  const value = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function getStarPosition(seed) {
  // Keep stars around the central text so the words remain readable.
  const zone = seed % 4;

  if (zone === 0) {
    return {
      x: 4 + seededNumber(seed, 1) * 15,
      y: 24 + seededNumber(seed, 2) * 52
    };
  }

  if (zone === 1) {
    return {
      x: 81 + seededNumber(seed, 1) * 15,
      y: 24 + seededNumber(seed, 2) * 52
    };
  }

  if (zone === 2) {
    return {
      x: 24 + seededNumber(seed, 1) * 52,
      y: 5 + seededNumber(seed, 2) * 10
    };
  }

  return {
    x: 24 + seededNumber(seed, 1) * 52,
    y: 83 + seededNumber(seed, 2) * 9
  };
}

function openLetter(id) {
  const letter = lettersById.get(id);
  if (!letter) return;

  readLetterText.textContent = letter.message;
  readLetterSignature.textContent = letter.sender
    ? `With love, ${letter.sender}`
    : "With love, someone who remembers";

  readDialog.showModal();
}

function renderStars(newIds = new Set()) {
  starLayer.replaceChildren();

  const letters = Array.from(lettersById.values());

  letterCount.textContent = String(letters.length);
  starLabel.textContent =
    letters.length === 1 ? "letter in her sky" : "letters in her sky";

  skyLoading.hidden = true;
  emptySky.hidden = letters.length > 0;

  for (const letter of letters) {
    const seed = hashString(letter.id);
    const position = getStarPosition(seed);

    const star = document.createElement("button");
    star.type = "button";
    star.className = "star-button";
    star.style.left = `${position.x}%`;
    star.style.top = `${position.y}%`;

    star.style.setProperty(
      "--star-size",
      `${15 + seededNumber(seed, 3) * 12}px`
    );

    star.style.setProperty(
      "--twinkle-speed",
      `${2.2 + seededNumber(seed, 4) * 3.8}s`
    );

    star.setAttribute(
      "aria-label",
      `Read a letter from ${letter.sender || "someone who remembers Niha"}`
    );
    star.title = "Click to read this letter";

    if (newIds.has(letter.id)) {
      star.classList.add("star-arriving");
    }

    const glyph = document.createElement("span");
    glyph.className = "star-glyph";
    glyph.textContent = "✦";
    glyph.setAttribute("aria-hidden", "true");

    star.appendChild(glyph);
    star.addEventListener("click", () => openLetter(letter.id));
    starLayer.appendChild(star);
  }
}

// Listen for saved letters and incoming submissions in real time.
const lettersQuery = query(
  lettersCollection,
  orderBy("createdAt", "desc")
);

onSnapshot(
  lettersQuery,
  (snapshot) => {
    const nextLetters = new Map();
    const newIds = new Set();

    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();

      if (
        typeof data.message !== "string" ||
        !data.message.trim()
      ) {
        return;
      }

      const letter = {
        id: docSnapshot.id,
        message: data.message,
        sender:
          typeof data.sender === "string" ? data.sender.trim() : ""
      };

      nextLetters.set(letter.id, letter);

      if (firstSnapshotReceived && !lettersById.has(letter.id)) {
        newIds.add(letter.id);
      }
    });

    lettersById = nextLetters;
    firstSnapshotReceived = true;
    renderStars(newIds);
  },
  (error) => {
    console.error("Could not load memorial letters:", error);
    skyLoading.hidden = true;
    emptySky.hidden = false;
    emptySky.textContent =
      "The stars couldn't be reached just now. Please refresh and try again.";
  }
);

// Save new letters in Firestore.
letterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (sendingLetter) return;

  const message = letterMessage.value.trim();
  const sender = anonymousToggle.checked ? "" : senderName.value.trim();

  if (!message) {
    setFormStatus("Please write a little something before sending.", "error");
    letterMessage.focus();
    return;
  }

  if (message.length > 3000) {
    setFormStatus("Your letter must be 3,000 characters or fewer.", "error");
    return;
  }

  if (sender.length > 80) {
    setFormStatus("Your name must be 80 characters or fewer.", "error");
    return;
  }

  sendingLetter = true;
  sendButton.disabled = true;
  sendButton.textContent = "Sending your letter...";
  setFormStatus("Sending your letter to the stars...");

  let timeoutId;

  try {
    const savePromise = addDoc(lettersCollection, {
      message,
      sender,
      createdAt: serverTimestamp()
    });

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(
        () => reject(new Error("SAVE_TIMEOUT")),
        25000
      );
    });

    await Promise.race([savePromise, timeoutPromise]);

    // Firestore's live listener will add and animate the new star.
    setFormStatus("Your letter has found its star. Thank you.", "success");

    letterForm.reset();
    senderName.disabled = false;
    characterCount.textContent = "0 / 3000";

    window.setTimeout(() => {
      letterDialog.close();
      setFormStatus("");
    }, 900);
  } catch (error) {
    console.error("Could not save memorial letter:", error);

    if (error.message === "SAVE_TIMEOUT") {
      setFormStatus(
        "This is taking longer than expected. Check the sky before trying again, so you don't send the same letter twice.",
        "error"
      );
    } else if (error.code === "permission-denied") {
      setFormStatus(
        "The database didn't allow this letter. Please check the Firestore rules.",
        "error"
      );
    } else {
      setFormStatus(
        "We couldn't save your letter just now. Please check your connection and try again.",
        "error"
      );
    }
  } finally {
    window.clearTimeout(timeoutId);
    sendingLetter = false;
    sendButton.disabled = false;

    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✧";

    sendButton.replaceChildren(
      icon,
      document.createTextNode(" Send this letter to the stars")
    );
  }
});
