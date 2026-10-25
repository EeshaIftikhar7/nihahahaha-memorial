
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

// Your Nihahaha Memorial Firebase project
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

// Page elements
const writeLetterButton = document.getElementById("writeLetterButton");
const letterDialog = document.getElementById("letterDialog");
const readDialog = document.getElementById("readDialog");
const closeWriteButton = document.getElementById("closeWrite");
const cancelWriteButton = document.getElementById("cancelWrite");
const closeReadButton = document.getElementById("closeRead");
const closeReadBottomButton = document.getElementById("closeReadBottom");

const letterForm = document.getElementById("letterForm");
const letterMessage = document.getElementById("letterMessage");
const senderName = document.getElementById("senderName");
const anonymousToggle = document.getElementById("anonymousToggle");
const sendButton = document.getElementById("sendButton");
const formStatus = document.getElementById("formStatus");
const characterCount = document.getElementById("characterCount");

const starSky = document.getElementById("starSky");
const starLayer = document.getElementById("starLayer");
const skyLoading = document.getElementById("skyLoading");
const emptySky = document.getElementById("emptySky");
const letterCount = document.getElementById("letterCount");
const starLabel = document.getElementById("starLabel");

const readLetterText = document.getElementById("readLetterText");
const readLetterSignature = document.getElementById("readLetterSignature");

let lettersById = new Map();
let sendingLetter = false;

// Dialog controls
writeLetterButton.addEventListener("click", () => {
  setFormStatus("");
  letterDialog.showModal();
  window.setTimeout(() => letterMessage.focus(), 50);
});

closeWriteButton.addEventListener("click", () => letterDialog.close());
cancelWriteButton.addEventListener("click", () => letterDialog.close());
closeReadButton.addEventListener("click", () => readDialog.close());
closeReadBottomButton.addEventListener("click", () => readDialog.close());

// Close a dialog when someone clicks its backdrop
for (const dialog of [letterDialog, readDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}

// Keep the letter character count updated
letterMessage.addEventListener("input", () => {
  characterCount.textContent = `${letterMessage.value.length} / 3000`;
});

// Anonymous letters do not include the visitor's name
anonymousToggle.addEventListener("change", () => {
  senderName.disabled = anonymousToggle.checked;

  if (anonymousToggle.checked) {
    senderName.setAttribute("aria-label", "Name not needed for anonymous letters");
  } else {
    senderName.removeAttribute("aria-label");
  }
});

// Show form feedback accessibly
function setFormStatus(message, type = "") {
  formStatus.textContent = message;
  formStatus.className = "form-status";

  if (type) {
    formStatus.classList.add(type);
  }
}

// Generate a repeatable number from a letter ID.
// This keeps a letter's star in the same position when new letters arrive.
function hashString(value) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededNumber(seed, offset) {
  const value = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

// Draw a star for each saved letter
function renderStars() {
  starLayer.replaceChildren();

  const letters = Array.from(lettersById.values());

  letterCount.textContent = String(letters.length);
  starLabel.textContent = letters.length === 1 ? "letter" : "letters";

  skyLoading.hidden = true;
  emptySky.hidden = letters.length > 0;

  letters.forEach((letter) => {
    const seed = hashString(letter.id);

    // Keep stars away from the very edge of the sky.
    const left = 7 + seededNumber(seed, 1) * 86;
    const top = 9 + seededNumber(seed, 2) * 82;
    const size = 15 + seededNumber(seed, 3) * 12;
    const twinkleSpeed = 2.2 + seededNumber(seed, 4) * 3.8;

    const star = document.createElement("button");
    star.type = "button";
    star.className = "star-button";
    star.style.left = `${left}%`;
    star.style.top = `${top}%`;
    star.style.setProperty("--star-size", `${size}px`);
    star.style.setProperty("--twinkle-speed", `${twinkleSpeed}s`);

    const sender = letter.sender || "Anonymous";
    star.setAttribute("aria-label", `Read a letter from ${sender}`);

    const glyph = document.createElement("span");
    glyph.className = "star-glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = "✦";

    star.appendChild(glyph);

    star.addEventListener("click", () => {
      openLetter(letter.id);
    });

    starLayer.appendChild(star);
  });
}

// Open a letter when its star is clicked
function openLetter(id) {
  const letter = lettersById.get(id);

  if (!letter) {
    return;
  }

  // textContent keeps visitors' letters as text, not executable HTML.
  readLetterText.textContent = letter.message;
  readLetterSignature.textContent = letter.sender
    ? `With love, ${letter.sender}`
    : "With love, someone who remembers";

  readDialog.showModal();
}

// Listen for letters stored in Firestore.
// New submissions from other visitors appear automatically.
const lettersQuery = query(
  lettersCollection,
  orderBy("createdAt", "desc")
);

onSnapshot(
  lettersQuery,
  (snapshot) => {
    lettersById = new Map();

    snapshot.forEach((documentSnapshot) => {
      const data = documentSnapshot.data();

      if (
        typeof data.message === "string" &&
        data.message.trim().length > 0
      ) {
        lettersById.set(documentSnapshot.id, {
          id: documentSnapshot.id,
          message: data.message,
          sender:
            typeof data.sender === "string" && data.sender.trim()
              ? data.sender.trim()
              : ""
        });
      }
    });

    renderStars();
  },
  (error) => {
    console.error("Could not load memorial letters:", error);
    skyLoading.hidden = true;
    emptySky.hidden = true;

    const errorMessage = document.createElement("p");
    errorMessage.className = "empty-sky";
    errorMessage.hidden = false;
    errorMessage.textContent =
      "The stars could not be loaded right now. Please refresh the page and try again.";

    starLayer.replaceChildren();
    starLayer.appendChild(errorMessage);
  }
);

// Submit a letter to Firestore
letterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (sendingLetter) {
    return;
  }

  const message = letterMessage.value.trim();
  const sender = anonymousToggle.checked
    ? ""
    : senderName.value.trim();

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
    setFormStatus("Please keep your name to 80 characters or fewer.", "error");
    senderName.focus();
    return;
  }

  sendingLetter = true;
  sendButton.disabled = true;
  sendButton.textContent = "Sending your letter...";
  setFormStatus("Sending your letter to the stars...");

  let timeoutId;

  try {
    // A server timestamp is required by the Firestore security rules below.
    const savePromise = addDoc(lettersCollection, {
      message,
      sender,
      createdAt: serverTimestamp()
    });

    // Avoid leaving the form in a loading state indefinitely.
    // A timeout does not necessarily mean the write failed.
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error("SAVE_TIMEOUT"));
      }, 25000);
    });

    await Promise.race([savePromise, timeoutPromise]);

    setFormStatus("Your letter has found its star. Thank you.", "success");

    letterForm.reset();
    characterCount.textContent = "0 / 3000";
    senderName.disabled = false;
    senderName.removeAttribute("aria-label");

    // Firestore's live listener will add the new star.
    window.setTimeout(() => {
      letterDialog.close();
      setFormStatus("");
    }, 1000);
  } catch (error) {
    console.error("Could not save memorial letter:", error);

    if (error.message === "SAVE_TIMEOUT") {
      setFormStatus(
        "This is taking longer than expected. Check whether your letter appears in the sky before trying again, so you don't accidentally send it twice.",
        "error"
      );
    } else if (error.code === "permission-denied") {
      setFormStatus(
        "The memorial's database permissions are not ready yet. Please try again later.",
        "error"
      );
    } else if (
      error.code === "unavailable" ||
      error.code === "deadline-exceeded"
    ) {
      setFormStatus(
        "The connection seems unavailable. Please check your internet and try again.",
        "error"
      );
    } else {
      setFormStatus(
        "We couldn't save your letter just now. Please try again in a moment.",
        "error"
      );
    }
  } finally {
    window.clearTimeout(timeoutId);
    sendingLetter = false;
    sendButton.disabled = false;

    const buttonIcon = document.createElement("span");
    buttonIcon.setAttribute("aria-hidden", "true");
    buttonIcon.textContent = "✧";

    sendButton.replaceChildren(
      buttonIcon,
      document.createTextNode(" Send this letter to the stars")
    );
  }
});
