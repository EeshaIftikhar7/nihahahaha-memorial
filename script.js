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

// Keep this configuration connected to your existing Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyD-GGAkCwQzfmmFfhHhgHe9kqlXNFc-ilo",
  authDomain: "nihahaha-memorial.firebaseapp.com",
  databaseURL: "https://nihahaha-memorial-default-rtdb.firebaseio.com",
  projectId: "nihahaha-memorial",
  storageBucket: "nihahaha-memorial.firebasestorage.app",
  messagingSenderId: "579027914898",
  appId: "1:579027914898:web:b00d7cbf8ddb5b6500964b",
  measurementId: "G-E726GXBG16"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const lettersCollection = collection(db, "letters");

// Page elements
const homeView = document.getElementById("homeView");
const aboutView = document.getElementById("aboutView");
const starsTab = document.getElementById("starsTab");
const loveLetterTab = document.getElementById("loveLetterTab");
const brandHome = document.getElementById("brandHome");
const starLayer = document.getElementById("starLayer");
const emptySky = document.getElementById("emptySky");
const connectionStatus = document.getElementById("connectionStatus");

const composeDialog = document.getElementById("composeDialog");
const readDialog = document.getElementById("readDialog");
const letterForm = document.getElementById("letterForm");
const letterMessage = document.getElementById("letterMessage");
const letterSender = document.getElementById("letterSender");
const anonymousCheckbox = document.getElementById("anonymousCheckbox");
const characterCount = document.getElementById("characterCount");
const formMessage = document.getElementById("formMessage");
const sendLetterButton = document.getElementById("sendLetterButton");
const readMessage = document.getElementById("readMessage");
const readSender = document.getElementById("readSender");

let lettersById = new Map();
let firstSnapshotReceived = false;
let sendingLetter = false;

const STAR_GLYPHS = ["✦", "✧", "⋆", "✶", "✴"];

const STAR_ZONES = [
  { x1: 4, x2: 24, y1: 12, y2: 84 },
  { x1: 76, x2: 96, y1: 12, y2: 84 },
  { x1: 25, x2: 75, y1: 5, y2: 18 },
  { x1: 25, x2: 75, y1: 82, y2: 94 }
];

// Switch between the two tabs.
function showView(viewName) {
  const showStars = viewName === "stars";

  homeView.hidden = !showStars;
  aboutView.hidden = showStars;

  starsTab.classList.toggle("active", showStars);
  loveLetterTab.classList.toggle("active", !showStars);

  starsTab.setAttribute("aria-selected", String(showStars));
  loveLetterTab.setAttribute("aria-selected", String(!showStars));

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (showStars) {
    window.requestAnimationFrame(positionStars);
  }
}

starsTab.addEventListener("click", () => showView("stars"));
loveLetterTab.addEventListener("click", () => showView("about"));

brandHome.addEventListener("click", (event) => {
  event.preventDefault();
  showView("stars");
});

// Dialog helpers.
function openDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(dialog) {
  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

// Close buttons.
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = document.getElementById(button.dataset.closeDialog);
    if (dialog) closeDialog(dialog);
  });
});

// Close a dialog when the visitor clicks its backdrop.
[composeDialog, readDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
});

// Open the letter-writing form.
function openComposeDialog() {
  letterForm.reset();

  characterCount.textContent = "0";
  formMessage.textContent = "";
  formMessage.classList.remove("success");

  letterSender.disabled = false;
  letterSender.placeholder = "Your name, if you'd like to share it";

  sendLetterButton.disabled = false;
  sendLetterButton.innerHTML =
    '<span aria-hidden="true">✦</span> Send this letter to the stars';

  openDialog(composeDialog);

  window.setTimeout(() => letterMessage.focus(), 80);
}

document
  .getElementById("writeLetterButton")
  .addEventListener("click", openComposeDialog);

document
  .getElementById("writeLetterButtonBottom")
  .addEventListener("click", openComposeDialog);

// Live character counter.
letterMessage.addEventListener("input", () => {
  characterCount.textContent = String(letterMessage.value.length);
});

// Anonymous letter option.
anonymousCheckbox.addEventListener("change", () => {
  letterSender.disabled = anonymousCheckbox.checked;

  if (anonymousCheckbox.checked) {
    letterSender.value = "";
    letterSender.placeholder = "Your name will not be shown";
  } else {
    letterSender.placeholder = "Your name, if you'd like to share it";
  }
});

function setFormMessage(message, isSuccess = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("success", isSuccess);
}

// Save a letter to Firestore.
letterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (sendingLetter) return;

  const message = letterMessage.value.trim();

  const sender = anonymousCheckbox.checked
    ? "Anonymous"
    : letterSender.value.trim() || "Anonymous";

  if (!message) {
    setFormMessage("Write a little something before sending your letter.");
    letterMessage.focus();
    return;
  }

  if (message.length > 3000) {
    setFormMessage(
      "Your letter is a little too long. Please keep it under 3,000 characters."
    );
    return;
  }

  sendingLetter = true;
  sendLetterButton.disabled = true;
  sendLetterButton.textContent = "Sending your letter…";
  setFormMessage("");

  try {
    await addDoc(lettersCollection, {
      message: message,
      sender: sender.slice(0, 80),
      createdAt: serverTimestamp()
    });

    setFormMessage("Your letter is becoming a star…", true);

    letterMessage.value = "";
    letterSender.value = "";
    characterCount.textContent = "0";

    window.setTimeout(() => {
      closeDialog(composeDialog);
      showView("stars");
    }, 900);
  } catch (error) {
    console.error("Unable to submit memorial letter:", error);

    setFormMessage(
      "We couldn't send your letter just now. Please check your connection and try again."
    );
  } finally {
    sendingLetter = false;
    sendLetterButton.disabled = false;
    sendLetterButton.innerHTML =
      '<span aria-hidden="true">✦</span> Send this letter to the stars';
  }
});

// Produce a repeatable number for each letter ID.
function stableNumber(value) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }

  return Math.abs(hash);
}

// Distribute stars around the edges of the sky.
function positionForLetter(id, index, total) {
  const zone = STAR_ZONES[index % STAR_ZONES.length];
  const hash = stableNumber(id);
  const spread = Math.floor(index / STAR_ZONES.length);

  const xSpan = zone.x2 - zone.x1;
  const ySpan = zone.y2 - zone.y1;

  const columns = Math.max(
    1,
    Math.ceil(Math.sqrt(total / STAR_ZONES.length))
  );

  const rows = Math.max(
    1,
    Math.ceil(total / STAR_ZONES.length / columns)
  );

  const col = spread % columns;
  const row = Math.floor(spread / columns) % rows;

  const xFraction =
    (col + 0.25 + ((hash % 31) / 100)) / columns;

  const yFraction =
    (row + 0.3 + (((hash >> 4) & 31) / 100)) / rows;

  const x = zone.x1 + Math.min(0.96, xFraction) * xSpan;
  const y = zone.y1 + Math.min(0.96, yFraction) * ySpan;

  return {
    x: Math.max(3, Math.min(97, x)),
    y: Math.max(4, Math.min(96, y))
  };
}

function positionStars() {
  const buttons = Array.from(
    starLayer.querySelectorAll(".letter-star")
  );

  const total = buttons.length;

  buttons.forEach((button, index) => {
    const position = positionForLetter(
      button.dataset.letterId,
      index,
      total
    );

    button.style.left = `${position.x}%`;
    button.style.top = `${position.y}%`;
  });
}

// Open a selected letter.
function openLetter(id) {
  const letter = lettersById.get(id);

  if (!letter) return;

  readMessage.textContent = letter.message || "";

  readSender.textContent =
    letter.sender && letter.sender !== "Anonymous"
      ? `With love, ${letter.sender}`
      : "With love, anonymously";

  openDialog(readDialog);
}

// Build the clickable stars from the letters loaded from Firebase.
function renderStars(newIds = new Set()) {
  starLayer.replaceChildren();

  const entries = Array.from(lettersById.entries());

  emptySky.hidden = entries.length > 0;

  entries.forEach(([id, letter]) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "letter-star";
    button.dataset.letterId = id;
    button.setAttribute(
      "aria-label",
      `Read a letter from ${letter.sender || "someone who loves Niha"}`
    );
    button.title = "Read this letter";

    const glyph = document.createElement("span");
    glyph.className = "star-glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent =
      STAR_GLYPHS[stableNumber(id) % STAR_GLYPHS.length];

    button.appendChild(glyph);

    const hash = stableNumber(id);

    button.style.setProperty(
      "--star-size",
      `${0.85 + (hash % 80) / 100}rem`
    );

    button.style.setProperty(
      "--twinkle-duration",
      `${2.8 + (hash % 35) / 10}s`
    );

    button.style.setProperty(
      "--twinkle-delay",
      `${-((hash % 40) / 10)}s`
    );

    if (newIds.has(id)) {
      button.classList.add("star-arriving");
    }

    button.addEventListener("click", () => openLetter(id));

    starLayer.appendChild(button);
  });

  positionStars();
}

// Listen for letters in the existing Firestore collection.
const lettersQuery = query(
  lettersCollection,
  orderBy("createdAt", "desc")
);

onSnapshot(
  lettersQuery,
  (snapshot) => {
    const nextLetters = new Map();
    const newIds = new Set();

    snapshot.forEach((documentSnapshot) => {
      const data = documentSnapshot.data();

      if (
        typeof data.message !== "string" ||
        !data.message.trim()
      ) {
        return;
      }

      nextLetters.set(documentSnapshot.id, {
        message: data.message,
        sender:
          typeof data.sender === "string" && data.sender.trim()
            ? data.sender.trim()
            : "Anonymous"
      });

      if (
        firstSnapshotReceived &&
        !lettersById.has(documentSnapshot.id)
      ) {
        newIds.add(documentSnapshot.id);
      }
    });

    lettersById = nextLetters;

    renderStars(newIds);

    firstSnapshotReceived = true;

    const count = lettersById.size;

    connectionStatus.textContent =
      count === 1
        ? "1 letter is shining here."
        : `${count} letters are shining here.`;
  },
  (error) => {
    console.error("Unable to load memorial letters:", error);

    connectionStatus.textContent =
      "The stars couldn't load just now. Please refresh the page.";
  }
);

// Keep stars positioned when the browser is resized.
window.addEventListener("resize", () => {
  window.requestAnimationFrame(positionStars);
});
