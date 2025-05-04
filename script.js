// تهيئة Firebase (استبدل بقيمك الخاصة)
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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// حالة اللعبة
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

// العناصر الصوتية
const audio = {
  lineComplete: document.getElementById("lineCompleteSound"),
  letterEarned: document.getElementById("letterEarnedSound"),
  win: document.getElementById("winSound"),
};

// عناصر DOM
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

// تسجيل الدخول بالبريد الإلكتروني
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
      showMessage("تم تسجيل الدخول بنجاح!", "success");
      elements.authContainer.style.display = "none";
      elements.gameContainer.style.display = "block";
      gameState.playerId = userCredential.user.uid;
    })
    .catch((error) => {
      showAuthError(error);
    });
});

// إنشاء حساب جديد
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
    })
    .catch((error) => {
      showAuthError(error);
    });
});

// تسجيل الدخول بجوجل
elements.googleLogin.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();

  firebase
    .auth()
    .signInWithPopup(provider)
    .then((result) => {
      showMessage("تم تسجيل الدخول بنجاح!", "success");
      elements.authContainer.style.display = "none";
      elements.gameContainer.style.display = "block";
      gameState.playerId = result.user.uid;
      elements.playerNameInput.value = result.user.displayName || "لاعب";
    })
    .catch((error) => {
      showAuthError(error);
    });
});

// تحقق من حالة المصادقة
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    gameState.playerId = user.uid;
    if (!gameState.playerName || gameState.playerName === "ضيف") {
      elements.playerNameInput.value =
        user.displayName || user.email.split("@")[0];
    }
    elements.authContainer.style.display = "none";
    elements.gameContainer.style.display = "block";
  } else {
    elements.authContainer.style.display = "flex";
    elements.gameContainer.style.display = "none";
  }
});

// بدء لعبة جديدة
elements.newGameBtn.addEventListener("click", () => {
  const playerName = elements.playerNameInput.value.trim() || "لاعب";
  const gridSize = parseInt(elements.gridSizeSelect.value);

  gameState.playerName = playerName;
  gameState.gridSize = gridSize;
  gameState.roomId = generateRoomId();
  gameState.isHost = true;

  elements.roomIdInput.value = gameState.roomId;
  elements.roomIdDisplay.textContent = gameState.roomId;

  initGame();
});

// الانضمام إلى غرفة موجودة
elements.joinGameBtn.addEventListener("click", () => {
  const playerName = elements.playerNameInput.value.trim() || "لاعب";
  const roomId = elements.roomIdInput.value.trim();

  if (!roomId) {
    showMessage("الرجاء إدخال رقم الغرفة", "warning");
    return;
  }

  gameState.playerName = playerName;
  gameState.roomId = roomId;
  gameState.isHost = false;

  elements.roomIdDisplay.textContent = roomId;

  joinRoom();
});

// التحقق من رقم مدخل
elements.checkNumberBtn.addEventListener("click", checkUserNumber);

// استدعاء رقم عشوائي
elements.callNumberBtn.addEventListener("click", callRandomNumber);

// السماح بالضغط على Enter لإدخال الرقم
elements.numberInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    checkUserNumber();
  }
});

// إنشاء رقم غرفة عشوائي
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// تهيئة اللعبة
function initGame() {
  gameState.numbers = generateRandomNumbers(
    gameState.gridSize * gameState.gridSize
  );
  gameState.calledNumbers = [];
  gameState.markedNumbers = [];
  gameState.completedLines = 0;
  gameState.earnedLetters = 0;
  gameState.isGameActive = true;

  updatePlayerDisplay();
  renderBingoGrid();
  resetPingooProgress();
  enableGameControls();

  if (gameState.isHost) {
    createRoom();
  } else {
    joinRoom();
  }
}

// إنشاء غرفة جديدة
function createRoom() {
  const roomRef = database.ref(`rooms/${gameState.roomId}`);

  roomRef.set({
    hostId: gameState.playerId,
    currentTurn: gameState.playerId,
    gridSize: gameState.gridSize,
    calledNumbers: [],
    players: {
      [gameState.playerId]: {
        name: gameState.playerName,
        pingooProgress: 0,
        numbers: gameState.numbers,
        markedNumbers: [],
      },
    },
  });

  setupRoomListeners();
}

// الانضمام إلى غرفة
function joinRoom() {
  const roomRef = database.ref(`rooms/${gameState.roomId}`);

  roomRef
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const roomData = snapshot.val();
        gameState.gridSize = roomData.gridSize;
        gameState.numbers = generateRandomNumbers(
          gameState.gridSize * gameState.gridSize
        );

        roomRef.child(`players/${gameState.playerId}`).set({
          name: gameState.playerName,
          pingooProgress: 0,
          numbers: gameState.numbers,
          markedNumbers: [],
        });

        setupRoomListeners();
        initGame();
      } else {
        showMessage("الغرفة غير موجودة!", "danger");
      }
    })
    .catch((error) => {
      showMessage("خطأ في الانضمام للغرفة: " + error.message, "danger");
    });
}

// إعداد مستمعي الغرفة
function setupRoomListeners() {
  const roomRef = database.ref(`rooms/${gameState.roomId}`);

  roomRef.on("value", (snapshot) => {
    const roomData = snapshot.val();
    if (!roomData) return;

    gameState.players = roomData.players;
    gameState.currentTurn = roomData.currentTurn;
    gameState.calledNumbers = roomData.calledNumbers || [];

    updatePlayersUI();
    updateCalledNumbersDisplay();
    checkTurn();

    // تحديث الأرقام المحددة
    if (roomData.players[gameState.playerId]?.markedNumbers) {
      gameState.markedNumbers =
        roomData.players[gameState.playerId].markedNumbers;
      renderBingoGrid();
      checkForCompletedLines();
    }
  });
}

// توليد أرقام عشوائية
function generateRandomNumbers(count) {
  const numbers = [];
  const maxNumber = gameState.gridSize * gameState.gridSize;

  while (numbers.length < count) {
    const randomNum = Math.floor(Math.random() * maxNumber) + 1;
    if (!numbers.includes(randomNum)) {
      numbers.push(randomNum);
    }
  }

  return numbers;
}

// عرض بطاقة البينجو
function renderBingoGrid() {
  elements.bingoGrid.innerHTML = "";
  elements.bingoGrid.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;

  gameState.numbers.forEach((num) => {
    const cell = document.createElement("div");
    cell.className = "bingo-cell";
    cell.textContent = num;
    cell.dataset.number = num;

    if (gameState.markedNumbers.includes(num)) {
      cell.classList.add("marked");
    }

    cell.addEventListener("click", () => toggleNumber(num, cell));
    elements.bingoGrid.appendChild(cell);
  });
}

// تبديل تحديد الرقم
function toggleNumber(number, cell) {
  if (!gameState.isGameActive || gameState.currentTurn !== gameState.playerId)
    return;

  if (gameState.calledNumbers.includes(number)) {
    const index = gameState.markedNumbers.indexOf(number);

    if (index === -1) {
      gameState.markedNumbers.push(number);
      cell.classList.add("marked");
    } else {
      gameState.markedNumbers.splice(index, 1);
      cell.classList.remove("marked");
    }

    updatePlayerMarkedNumbers();
    checkForCompletedLines();
  }
}

// التحقق من الرقم المدخل
function checkUserNumber() {
  if (!gameState.isGameActive || gameState.currentTurn !== gameState.playerId)
    return;

  const number = parseInt(elements.numberInput.value);
  const maxNumber = gameState.gridSize * gameState.gridSize;

  if (isNaN(number)) {
    showMessage("الرجاء إدخال رقم صحيح", "warning");
    return;
  }

  if (number < 1 || number > maxNumber) {
    showMessage(`الرقم يجب أن يكون بين 1 و ${maxNumber}`, "warning");
    return;
  }

  if (gameState.calledNumbers.includes(number)) {
    showMessage("هذا الرقم تم استدعاؤه مسبقاً", "info");
    return;
  }

  processNumber(number);
  elements.numberInput.value = "";
}

// استدعاء رقم عشوائي
function callRandomNumber() {
  if (!gameState.isGameActive || gameState.currentTurn !== gameState.playerId)
    return;

  const availableNumbers = [];
  const maxNumber = gameState.gridSize * gameState.gridSize;

  for (let i = 1; i <= maxNumber; i++) {
    if (!gameState.calledNumbers.includes(i)) {
      availableNumbers.push(i);
    }
  }

  if (availableNumbers.length === 0) {
    endGame("تم استدعاء جميع الأرقام!");
    return;
  }

  const randomIndex = Math.floor(Math.random() * availableNumbers.length);
  const calledNumber = availableNumbers[randomIndex];

  processNumber(calledNumber);
}

// معالجة الرقم المستدعى
function processNumber(number) {
  if (!gameState.isHost) return;

  const roomRef = database.ref(`rooms/${gameState.roomId}`);

  // إضافة الرقم إلى القائمة المستدعاة
  const newCalledNumbers = [...gameState.calledNumbers, number];
  roomRef.update({
    calledNumbers: newCalledNumbers,
  });

  // تحديث الدور
  const playerIds = Object.keys(gameState.players);
  const currentIndex = playerIds.indexOf(gameState.currentTurn);
  const nextIndex = (currentIndex + 1) % playerIds.length;
  const nextPlayerId = playerIds[nextIndex];

  roomRef.update({
    currentTurn: nextPlayerId,
  });
}

// التحقق من الخطوط المكتملة
function checkForCompletedLines() {
  const gridSize = gameState.gridSize;
  const marked = gameState.markedNumbers;
  const numbers = gameState.numbers;
  let newLines = 0;

  // جميع الخطوط الممكنة (صفوف، أعمدة، أقطار)
  const allLines = [];

  // الصفوف
  for (let row = 0; row < gridSize; row++) {
    const rowStart = row * gridSize;
    const rowNumbers = numbers.slice(rowStart, rowStart + gridSize);
    allLines.push(rowNumbers);
  }

  // الأعمدة
  for (let col = 0; col < gridSize; col++) {
    const colNumbers = [];
    for (let row = 0; row < gridSize; row++) {
      colNumbers.push(numbers[row * gridSize + col]);
    }
    allLines.push(colNumbers);
  }

  // القطر الأول (من الأعلى يسار إلى الأسفل يمين)
  const diag1 = [];
  for (let i = 0; i < gridSize; i++) {
    diag1.push(numbers[i * gridSize + i]);
  }
  allLines.push(diag1);

  // القطر الثاني (من الأعلى يمين إلى الأسفل يسار)
  const diag2 = [];
  for (let i = 0; i < gridSize; i++) {
    diag2.push(numbers[i * gridSize + (gridSize - 1 - i)]);
  }
  allLines.push(diag2);

  // التحقق من كل خط
  allLines.forEach((line) => {
    if (line.every((num) => marked.includes(num))) {
      newLines++;
      highlightCells(line);
    }
  });

  if (newLines > 0) {
    audio.lineComplete.play();
    gameState.completedLines += newLines;
    awardPingooLetters(newLines);
  }
}

// إبراز الخلايا المكتملة
function highlightCells(numbers) {
  const cells = document.querySelectorAll(".bingo-cell");
  cells.forEach((cell) => {
    if (numbers.includes(parseInt(cell.dataset.number))) {
      cell.classList.add("completed-line");
      setTimeout(() => {
        cell.classList.remove("completed-line");
      }, 2000);
    }
  });
}

// منح حروف بينغو
function awardPingooLetters(linesCompleted) {
  const lettersToAward = Math.min(
    linesCompleted,
    gameState.pingooLetters.length - gameState.earnedLetters
  );

  for (let i = 0; i < lettersToAward; i++) {
    const letterIndex = gameState.earnedLetters + i;
    const letterElements = document.querySelectorAll(".letter");
    letterElements[letterIndex].classList.add("earned");
    audio.letterEarned.play();
  }

  gameState.earnedLetters += lettersToAward;

  // تحديث التقدم في قاعدة البيانات
  const playerRef = database.ref(
    `rooms/${gameState.roomId}/players/${gameState.playerId}`
  );
  playerRef.update({
    pingooProgress: gameState.earnedLetters,
  });

  if (gameState.earnedLetters >= gameState.pingooLetters.length) {
    audio.win.play();
    endGame(`مبروك ${gameState.playerName}! لقد ربحت اللعبة!`);
  } else {
    showMessage(`لقد ربحت ${linesCompleted} حرفاً!`, "success");
  }
}

// إنهاء اللعبة
function endGame(message) {
  gameState.isGameActive = false;
  showMessage(message, "success");

  if (gameState.isHost) {
    // إغلاق الغرفة بعد 30 ثانية
    setTimeout(() => {
      database.ref(`rooms/${gameState.roomId}`).remove();
    }, 30000);
  }
}

// تحديث واجهة اللاعبين
function updatePlayersUI() {
  elements.playersList.innerHTML = "";

  Object.entries(gameState.players).forEach(([id, player]) => {
    const li = document.createElement("li");
    li.className = `list-group-item ${
      gameState.currentTurn === id ? "active" : ""
    }`;

    const progress = player.pingooProgress || 0;
    const progressText = gameState.pingooLetters.slice(0, progress).join("");

    li.innerHTML = `
          <strong>${player.name}</strong>
          <span class="float-left">${progressText}</span>
          ${
            id === gameState.playerId
              ? '<span class="badge bg-primary">أنت</span>'
              : ""
          }
      `;

    elements.playersList.appendChild(li);
  });
}

// التحقق من دور اللاعب الحالي
function checkTurn() {
  if (gameState.currentTurn === gameState.playerId) {
    enableControls();
    showMessage("دورك الآن!", "info");
  } else {
    disableControls();
    const currentPlayer =
      gameState.players[gameState.currentTurn]?.name || "لاعب آخر";
    showMessage(`في انتظار ${currentPlayer}...`, "info");
  }
}

// تمكين عناصر التحكم
function enableControls() {
  elements.numberInput.disabled = false;
  elements.checkNumberBtn.disabled = false;
  elements.callNumberBtn.disabled = false;
}

// تعطيل عناصر التحكم
function disableControls() {
  elements.numberInput.disabled = true;
  elements.checkNumberBtn.disabled = true;
  elements.callNumberBtn.disabled = true;
}

// تمكين عناصر اللعبة
function enableGameControls() {
  elements.newGameBtn.disabled = false;
  elements.joinGameBtn.disabled = false;
}

// تحديث الأرقام المستدعاة
function updateCalledNumbersDisplay() {
  elements.calledNumbersContainer.innerHTML = "";

  gameState.calledNumbers.forEach((num) => {
    const numElement = document.createElement("span");
    numElement.className = "called-number";
    numElement.textContent = num;
    elements.calledNumbersContainer.appendChild(numElement);
  });
}

// تحديث الأرقام المحددة للاعب
function updatePlayerMarkedNumbers() {
  const playerRef = database.ref(
    `rooms/${gameState.roomId}/players/${gameState.playerId}`
  );
  playerRef.update({
    markedNumbers: gameState.markedNumbers,
  });
}

// تحديث عرض اسم اللاعب
function updatePlayerDisplay() {
  elements.playerDisplay.textContent = `لاعب: ${gameState.playerName}`;
}

// إعادة تعيين تقدم بينغو
function resetPingooProgress() {
  const letters = document.querySelectorAll(".letter");
  letters.forEach((letter) => {
    letter.classList.remove("earned");
  });

  elements.pingooMessage.textContent = "";
  elements.pingooMessage.className = "mt-3 text-center";
}

// عرض رسالة
function showMessage(message, type = "info") {
  elements.pingooMessage.textContent = message;
  elements.pingooMessage.className = `mt-3 text-center text-${type}`;
}

// عرض خطأ المصادقة
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
    default:
      message = "حدث خطأ: " + error.message;
  }

  showMessage(message, "danger");
}

// تهيئة أولية
updatePlayerDisplay();
resetPingooProgress();
