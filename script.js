// Firebase Configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyBiP-Urd5-MgVfOQzx2G6vwEUDmGU73UfQ",
  authDomain: "pingoo-bingo-multiplayer.firebaseapp.com",
  databaseURL:
    "https://pingoo-bingo-multiplayer-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "pingoo-bingo-multiplayer",
  storageBucket: "pingoo-bingo-multiplayer.firebasestorage.app",
  messagingSenderId: "741737133760",
  appId: "1:741737133760:web:4c88d244dfa645d5051f25",
  measurementId: "G-PQS39HWH33",
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Game state
let gameState = {
  playerName: "ضيف",
  playerId: null,
  roomId: null,
  isHost: false,
  currentTurn: null,
  players: {},
  gridSize: 5,
  numbers: [],
  calledNumbers: [],
  markedNumbers: [],
  completedLines: 0,
  isGameActive: false,
  pingooLetters: ["ب", "ي", "ن", "غ", "و"],
  earnedLetters: 0,
};

// DOM elements
const elements = {
  authContainer: document.getElementById("auth-container"),
  gameContainer: document.getElementById("game-container"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  loginBtn: document.getElementById("loginBtn"),
  signupBtn: document.getElementById("signupBtn"),
  googleLogin: document.getElementById("googleLogin"),
  playerNameInput: document.getElementById("playerName"),
  gridSizeSelect: document.getElementById("gridSize"),
  roomIdInput: document.getElementById("roomId"),
  newGameBtn: document.getElementById("newGameBtn"),
  joinGameBtn: document.getElementById("joinGameBtn"),
  numberInput: document.getElementById("numberInput"),
  checkNumberBtn: document.getElementById("checkNumberBtn"),
  callNumberBtn: document.getElementById("callNumberBtn"),
  calledNumbersContainer: document.getElementById("calledNumbers"),
  bingoGrid: document.getElementById("bingoGrid"),
  playerDisplay: document.getElementById("playerDisplay"),
  pingooProgress: document.getElementById("pingooProgress"),
  pingooMessage: document.getElementById("pingooMessage"),
  playersList: document.getElementById("playersList"),
  roomIdDisplay: document.getElementById("roomIdDisplay"),
};

// Initialize Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Google Sign-In Handler
elements.googleLogin.addEventListener("click", () => {
  // Show loading state
  const originalText = elements.googleLogin.innerHTML;
  elements.googleLogin.innerHTML =
    '<i class="fab fa-google"></i> جاري التحميل <span class="loading-spinner"></span>';
  elements.googleLogin.disabled = true;

  firebase
    .auth()
    .signInWithPopup(googleProvider)
    .then((result) => {
      // Successful sign-in
      const user = result.user;
      console.log("Google sign-in success:", user);

      // Update UI
      elements.authContainer.style.display = "none";
      elements.gameContainer.style.display = "block";

      // Set player name from Google account
      elements.playerNameInput.value =
        user.displayName || user.email.split("@")[0];
      gameState.playerId = user.uid;
      gameState.playerName = user.displayName || user.email.split("@")[0];

      showMessage("تم تسجيل الدخول بنجاح!", "success");
      updatePlayerDisplay();
    })
    .catch((error) => {
      console.error("Google sign-in error:", error);

      // Restore button state
      elements.googleLogin.innerHTML =
        '<i class="fab fa-google"></i> الدخول بجوجل';
      elements.googleLogin.disabled = false;

      // Handle specific errors
      let errorMessage = "حدث خطأ أثناء تسجيل الدخول";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMessage = "هذا البريد الإلكتروني مسجل بالفعل بطريقة أخرى";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "تم إغلاق نافذة التسجيل";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "الرجاء السماح بالنوافذ المنبثقة لهذا الموقع";
      } else if (error.code === "auth/unauthorized-domain") {
        errorMessage = "هذا المجال غير مسموح به للتسجيل";
      }

      showMessage(errorMessage, "danger");
    });
});

// Email/Password Sign-Up
elements.signupBtn.addEventListener("click", () => {
  const email = elements.email.value;
  const password = elements.password.value;

  if (!email || !password) {
    showMessage("الرجاء إدخال البريد الإلكتروني وكلمة السر", "danger");
    return;
  }

  firebase
    .auth()
    .createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      showMessage("تم إنشاء الحساب بنجاح!", "success");
      gameState.playerId = userCredential.user.uid;
      elements.authContainer.style.display = "none";
      elements.gameContainer.style.display = "block";
    })
    .catch((error) => {
      showAuthError(error);
    });
});

// Email/Password Login
elements.loginBtn.addEventListener("click", () => {
  const email = elements.email.value;
  const password = elements.password.value;

  if (!email || !password) {
    showMessage("الرجاء إدخال البريد الإلكتروني وكلمة السر", "danger");
    return;
  }

  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      gameState.playerId = userCredential.user.uid;
      elements.authContainer.style.display = "none";
      elements.gameContainer.style.display = "block";
    })
    .catch((error) => {
      showAuthError(error);
    });
});

// Initialize auth state listener
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // User is signed in
    gameState.playerId = user.uid;
    if (!gameState.playerName || gameState.playerName === "ضيف") {
      elements.playerNameInput.value =
        user.displayName || user.email.split("@")[0];
      gameState.playerName = user.displayName || user.email.split("@")[0];
    }
    elements.authContainer.style.display = "none";
    elements.gameContainer.style.display = "block";
    updatePlayerDisplay();
  } else {
    // User is signed out
    elements.authContainer.style.display = "flex";
    elements.gameContainer.style.display = "none";
  }
});

// Show error messages
function showAuthError(error) {
  let message = "";

  switch (error.code) {
    case "auth/invalid-email":
      message = "بريد إلكتروني غير صحيح";
      break;
    case "auth/user-disabled":
      message = "هذا الحساب معطل";
      break;
    case "auth/user-not-found":
      message = "الحساب غير موجود";
      break;
    case "auth/wrong-password":
      message = "كلمة السر خاطئة";
      break;
    case "auth/email-already-in-use":
      message = "هذا البريد مستخدم بالفعل";
      break;
    case "auth/weak-password":
      message = "كلمة السر ضعيفة (يجب 6 أحرف على الأقل)";
      break;
    case "auth/operation-not-allowed":
      message = "طريقة التسجيل هذه غير مفعّلة";
      break;
    default:
      message = "حدث خطأ: " + error.message;
  }

  showMessage(message, "danger");
}

// Show message
function showMessage(message, type = "info") {
  elements.pingooMessage.textContent = message;
  elements.pingooMessage.className = `mt-3 text-center text-${type}`;
}

// Update player display
function updatePlayerDisplay() {
  elements.playerDisplay.textContent = `لاعب: ${gameState.playerName}`;
}

// Initialize the game
updatePlayerDisplay();
