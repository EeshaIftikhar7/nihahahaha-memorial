
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// STEP 1: Replace these placeholders with your Firebase config values.
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

const starfield = document.getElementById("starfield");
const sky = document.getElementById("sky");
const starCount = document.getElementById("star-count");

const letterDialog = document.getElementById("letter-dialog");
const writeDialog = document.getElementById("write-dialog");

const letterTitle = document.getElementById("letter-title");
const letterMessage = document.getElementById("letter-message");
const letterSignature = document.getElementById("letter-signature");

const letterForm = document.getElementById("letter-form");
const senderInput = document.getElementById("sender");
const messageInput = document.getElementById("message");
const charCount = document.getElementById("char-count");
const formStatus = document.getElementById("form-status");
const toast = document.getElementById("toast");

let letters = [];
let toastTimeout;

function makeDust() {
  if (starfield.querySelector(".dust")) return;

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < 150; i++) {
    const dust = document.createElement("span");
    dust.className = "dust";

    dust.style.cssText = `
      position:absolute;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      width:${Math.random() > 0.8 ? 2 : 1}px;
      height:${Math.random() > 0.8 ? 2 : 1}px;
      border-radius:50%;
      background:#dbe4ff;
      opacity:${0.15 + Math.random() * 0.45};
      pointer-events:none;
    `;

    fragment.appendChild(dust);
  }

  starfield.appendChild(fragment);
}

function createStar(letter, index, isNew = false) {
  const star = document.createElement("button");
  star.type = "button";
  star.className = "star";

  if (index % 3 === 0) star.classList.add("small");
  if (isNew) star.classList.add("new-star");

  const positions = [
    [8, 25], [91, 23], [15, 51], [84, 48],
    [5, 72], [95, 69], [24, 83], [75, 86],
    [38, 76], [61, 79], [12, 91], [88, 92],
    [32, 22], [70, 19], [48, 89]
  ];

  const [x, y] = positions[index % positions.length];

  const offsetX = index >= positions.length
    ? Math.random() * 10 - 5
    : 0;

  const offsetY = index >= positions.length
    ? Math.random() * 8 - 4
    : 0;

  star.style.left = `${Math.max(3, Math.min(97, x + offsetX))}%`;
  star.style.top = `${Math.max(12, Math.min(94, y + offsetY))}%`;
  star.style.setProperty("--delay", `${Math.random() * 4}s`);

  star.setAttribute("aria-label", "Read a letter for Nihahahaha");
  star.title = "A letter is waiting here";

  star.addEventListener("click", () => openLetter(letter));
  sky.appendChild(star);

  if (isNew) {
    setTimeout(() => star.classList.remove("new-star"), 5000);
  }

  return star;
}

function updateCount() {
  starCount.textContent = letters.length;
}

function openLetter(letter) {
  letterTitle.textContent = letter.title || "A letter to you";
  letterMessage.textContent = letter.message;

  letterSignature.textContent = letter.sender
    ? `With love, ${letter.sender}`
    : "From someone who holds you in their heart";

  letterDialog.showModal();
}

function showToast(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("visible");

  toastTimeout = setTimeout(() => {
    toast.classList.remove("visible");
  }, 3500);
}

function openWriteForm() {
  formStatus.textContent = "";
  writeDialog.showModal();
}

function closeDialog(dialog) {
  dialog.close();
}

function renderLetters() {
  // Rebuild the starfield whenever Firebase sends updated letters.
  sky.querySelectorAll(".star").forEach(star => star.remove());

  letters.forEach((letter, index) => {
    createStar(letter, index);
  });

  updateCount();
}

function listenForLetters() {
  const lettersQuery = query(
    collection(db, "letters"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    lettersQuery,
    (snapshot) => {
      letters = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: "A letter for Nihahahaha",
        message: doc.data().message,
        sender: doc.data().sender || ""
      }));

      renderLetters();
    },
    (error) => {
      console.error("Could not load letters:", error);
      showToast("We couldn't load the letters. Please try again later.");
    }
  );
}

document.getElementById("write-button")
  .addEventListener("click", openWriteForm);

document.getElementById("explore-button")
  .addEventListener("click", () => {
    showToast("Choose any glowing star to read a letter ✧");
  });

document.getElementById("close-letter")
  .addEventListener("click", () => closeDialog(letterDialog));

document.getElementById("close-write")
  .addEventListener("click", () => closeDialog(writeDialog));

letterDialog.addEventListener("click", (event) => {
  if (event.target === letterDialog) letterDialog.close();
});

writeDialog.addEventListener("click", (event) => {
  if (event.target === writeDialog) writeDialog.close();
});

messageInput.addEventListener("input", () => {
  charCount.textContent = messageInput.value.length;
});

letterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  const sender = senderInput.value.trim();

  if (!message) {
    formStatus.textContent = "Write a few words before sending your letter.";
    return;
  }

  if (message.length > 3000 || sender.length > 80) {
    formStatus.textContent = "Please shorten your letter or signature.";
    return;
  }

  const submitButton = letterForm.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  formStatus.textContent = "Sending your letter…";

  try {
    await addDoc(collection(db, "letters"), {
      message,
      sender,
      createdAt: serverTimestamp()
    });

    letterForm.reset();
    charCount.textContent = "0";
    writeDialog.close();

    showToast("Your letter has become a star ✧");
  } catch (error) {
    console.error("Could not save letter:", error);
    formStatus.textContent =
      "Your letter couldn't be saved. Please try again in a moment.";
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

makeDust();
listenForLetters();
