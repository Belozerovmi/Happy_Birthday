/* ============================================================
   ⬇️⬇️⬇️  ЗДЕСЬ ВПИСЫВАЙ СВОИХ ЛЮДЕЙ  ⬇️⬇️⬇️
   ============================================================ */
const PEOPLE = [
  {
    name: "Мама",
    photo: "assets/photos/мама.jpg",
    audio: "assets/audio/мама_к.mp3",
  },
  {
    name: "Папа",
    photo: "assets/photos/папа.jpg",
    audio: "assets/audio/папа_к.mp3",
  },
  {
    name: "Брат",
    photo: "assets/photos/Крёстный.jpg",
    audio: "assets/audio/Крёстный.mp3",
  },
  {
    name: "Муж",
    photo: "assets/photos/муж.jpg",
    audio: "assets/audio/Муж.mp3",
  },
  {
    name: "Ира",
    photo: "assets/photos/Ирина Краснова.jpg",
    audio: "assets/audio/Ирина Краснова.mp3",
  },
  {
    name: "Наташа",
    photo: "assets/photos/Наталья Бигун.jpg",
    audio: "assets/audio/Наталья Бигун.mp3",
  },
];

/* ============================================================
   ⬇️⬇️⬇️  ФОТО ДЛЯ ФИНАЛЬНОГО КОЛЛАЖА  ⬇️⬇️⬇️
   ------------------------------------------------------------
   Ровно 10 путей — раскладка будет 2 колонки × 5 строк.
   ============================================================ */
const FINAL_PHOTOS = [
  "assets/photos/Natali_1.jpg",
  "assets/photos/Natali_2.jpg",
  "assets/photos/Natali_3.jpg",
  "assets/photos/Natali_4.jpg",
  "assets/photos/Natali_5.jpg",
  "assets/photos/Natali_6.jpg",
  "assets/photos/Natali_7.jpg",
  "assets/photos/Natali_8.jpg",
  "assets/photos/Natali_9.jpg",
  "assets/photos/Natali_10.jpg",
];
/* ============================================================
   ⬆️⬆️⬆️  КОНЕЦ РЕДАКТИРУЕМОГО БЛОКА  ⬆️⬆️⬆️
   ============================================================ */

const deckEl = document.getElementById("deck");
const onboardingEl = document.getElementById("onboarding");
const onboardingBtn = document.getElementById("onboardingBtn");
const finishEl = document.getElementById("finish");
const restartBtn = document.getElementById("restartBtn");

const AUTO_NEXT_DELAY = 500;
const SWIPE_THRESHOLD = 90;
const ANIM_DURATION = 420;

let currentIndex = 0;
let autoNextTimer = null;
let isAnimating = false;

/* ================= SVG-иконки ================= */
const SVG = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
};

/* ================= Формат времени ================= */
function fmt(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ================= Создание карточки ================= */
function createCard(person, index) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.index = index;

  card.innerHTML = `
    <div class="card__bg" style="background-image:url('${person.photo}')"></div>
    <div class="card__name">${person.name}</div>
    <div class="player">
      <div class="player__progress">
        <div class="player__progress-fill"></div>
      </div>
      <div class="player__row">
        <span class="player__time player__time--current">0:00</span>
        <span class="player__spacer"></span>
        <button class="player__btn" data-role="toggle">${SVG.play}</button>
        <span class="player__spacer"></span>
        <span class="player__time player__time--total">0:00</span>
      </div>
    </div>
    <audio src="${person.audio}" preload="metadata"></audio>
  `;

  const audio = card.querySelector("audio");
  const toggleBtn = card.querySelector('[data-role="toggle"]');
  const progressFill = card.querySelector(".player__progress-fill");
  const progressEl = card.querySelector(".player__progress");
  const timeCur = card.querySelector(".player__time--current");
  const timeTotal = card.querySelector(".player__time--total");

  audio.addEventListener("loadedmetadata", () => {
    timeTotal.textContent = fmt(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    const p = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    progressFill.style.width = p + "%";
    timeCur.textContent = fmt(audio.currentTime);
  });

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (audio.paused) {
      pauseAllExcept(audio);
      audio.play();
    } else {
      audio.pause();
    }
  });

  audio.addEventListener("play", () => {
    toggleBtn.innerHTML = SVG.pause;
    clearTimeout(autoNextTimer);
  });
  audio.addEventListener("pause", () => {
    toggleBtn.innerHTML = SVG.play;
  });

  audio.addEventListener("ended", () => {
    toggleBtn.innerHTML = SVG.play;
    clearTimeout(autoNextTimer);
    autoNextTimer = setTimeout(() => {
      if (currentIndex === index) goToNext();
    }, AUTO_NEXT_DELAY);
  });

  progressEl.addEventListener("click", (e) => {
    const rect = progressEl.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (audio.duration) audio.currentTime = ratio * audio.duration;
  });

  return card;
}

/* ================= Позиционирование карточек ================= */
function offscreenOffset() {
  return window.innerWidth + 80;
}

function setCardPosition(card, offset, animate = false) {
  const w = offscreenOffset();

  let x, scale, opacity, rotate;

  if (offset === 0) {
    x = 0;
    scale = 1;
    opacity = 1;
    rotate = 0;
  } else {
    x = offset > 0 ? w : -w;
    scale = 0.9;
    opacity = 1;
    rotate = offset > 0 ? 8 : -8;
  }

  if (animate) {
    card.style.transition = `transform ${ANIM_DURATION}ms cubic-bezier(.22,.61,.36,1), opacity ${ANIM_DURATION}ms`;
  } else {
    card.style.transition = "none";
  }

  card.style.transform = `translate3d(${x}px, 0, 0) scale(${scale}) rotate(${rotate}deg)`;
  card.style.opacity = opacity;
  card.style.pointerEvents = offset === 0 ? "auto" : "none";
}

/* ================= Свайпы ================= */
function attachSwipe(card, index) {
  let startX = 0;
  let startY = 0;
  let curX = 0;
  let dragging = false;

  const onStart = (e) => {
    if (isAnimating) return;
    if (index !== currentIndex) return;

    const p = e.touches ? e.touches[0] : e;
    startX = p.clientX;
    startY = p.clientY;
    curX = 0;
    dragging = true;

    card.style.transition = "none";
  };

  const onMove = (e) => {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    curX = p.clientX - startX;
    const dy = p.clientY - startY;

    if (Math.abs(dy) > Math.abs(curX) * 2 && Math.abs(curX) < 20) return;

    const rotate = curX / 22;
    const scale = 1 - Math.min(Math.abs(curX) / 2600, 0.04);

    card.style.transform = `translate3d(${curX}px, 0, 0) rotate(${rotate}deg) scale(${scale})`;
    card.style.opacity = String(1 - Math.min(Math.abs(curX) / 700, 0.55));
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;

    const swipedLeft = curX < -SWIPE_THRESHOLD;
    const swipedRight = curX > SWIPE_THRESHOLD;

    if (swipedLeft) {
      swipeTo(-1);
    } else if (swipedRight) {
      swipeTo(1);
    } else {
      setCardPosition(card, 0, true);
      card.style.opacity = "1";
    }
    curX = 0;
  };

  card.addEventListener("touchstart", onStart, { passive: true });
  card.addEventListener("touchmove", onMove, { passive: true });
  card.addEventListener("touchend", onEnd);
  card.addEventListener("touchcancel", onEnd);

  card.addEventListener("mousedown", (e) => {
    e.preventDefault();
    onStart(e);
  });
  window.addEventListener("mousemove", (e) => {
    if (dragging) onMove(e);
  });
  window.addEventListener("mouseup", () => {
    if (dragging) onEnd();
  });
}

/* ================= Главный переключатель ================= */
function swipeTo(direction) {
  if (isAnimating) return;

  const goingForward = direction === -1;
  const target = goingForward ? currentIndex + 1 : currentIndex - 1;

  if (target < 0) {
    const card = getCardEl(currentIndex);
    if (card) setCardPosition(card, 0, true);
    return;
  }
  if (target >= PEOPLE.length) {
    // Сначала останавливаем текущее аудио, чтобы оно не доигрывало под финалом
    const lastCard = getCardEl(currentIndex);
    if (lastCard) {
      const a = lastCard.querySelector("audio");
      if (a) {
        a.pause();
        a.currentTime = 0; // сброс, чтобы при возврате не продолжало с середины
      }
    }
    showFinish();
    return;
  }

  isAnimating = true;

  const currentCard = getCardEl(currentIndex);
  const nextCard = ensureCard(target);

  const w = offscreenOffset();

  if (currentCard) {
    currentCard.style.transition = `transform ${ANIM_DURATION}ms cubic-bezier(.22,.61,.36,1), opacity ${ANIM_DURATION}ms`;
    currentCard.style.transform = `translate3d(${direction * (w + 60)}px, 0, 0) rotate(${direction * 20}deg) scale(0.9)`;
    currentCard.style.opacity = "0";
    currentCard.style.pointerEvents = "none";

    const a = currentCard.querySelector("audio");
    if (a) a.pause();
  }

  if (nextCard) {
    setCardPosition(nextCard, goingForward ? 1 : -1, false);
    nextCard.style.opacity = "1";
    nextCard.style.pointerEvents = "none";
    void nextCard.offsetWidth;

    requestAnimationFrame(() => {
      setCardPosition(nextCard, 0, true);
    });

    autoPlayCard(nextCard);
  }

  setTimeout(() => {
    currentIndex = target;
    isAnimating = false;
    renderDeck(true);
  }, ANIM_DURATION);
}

/* ================= Утилиты ================= */
function getCardEl(index) {
  return deckEl.querySelector(`.card[data-index="${index}"]`);
}

function ensureCard(index) {
  if (index < 0 || index >= PEOPLE.length) return null;
  let card = getCardEl(index);
  if (!card) {
    card = createCard(PEOPLE[index], index);
    deckEl.appendChild(card);
    setCardPosition(card, index >= currentIndex ? 1 : -1, false);
    attachSwipe(card, index);
  }
  return card;
}

function renderDeck(animateCurrent = false) {
  ensureCard(currentIndex - 1);
  ensureCard(currentIndex);
  ensureCard(currentIndex + 1);

  const cards = deckEl.querySelectorAll(".card");
  cards.forEach((card) => {
    const i = parseInt(card.dataset.index, 10);
    const offset = i - currentIndex;

    if (offset === 0) {
      setCardPosition(card, 0, animateCurrent);
      card.style.opacity = "1";
    } else {
      setCardPosition(card, offset > 0 ? 1 : -1, animateCurrent);
    }
  });

  cards.forEach((card) => {
    const i = parseInt(card.dataset.index, 10);
    if (Math.abs(i - currentIndex) > 2) {
      card.querySelector("audio")?.pause();
      card.remove();
    }
  });
}

/* ================= Навигация ================= */
function goToNext() {
  swipeTo(-1);
}
function goToPrev() {
  swipeTo(1);
}

function pauseAllExcept(current) {
  document.querySelectorAll("audio").forEach((a) => {
    if (a !== current) a.pause();
  });
}

/* ================= Автозапуск аудио ================= */
function autoPlayCard(card) {
  const audio = card.querySelector("audio");
  if (!audio) return;

  audio.currentTime = 0;
  audio.playbackRate = 1;

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

/* ================================================================
   ФИНАЛЬНЫЙ ЭКРАН — простая сетка 2 × 5 из квадратных фото.
   Раскладку делает CSS Grid, JS только создаёт плитки и анимирует.
   ================================================================ */

/* ---------- Параметры ---------- */
const COLLAGE_APPEAR_DELAY = 80; // пауза перед первым фото, мс
const COLLAGE_STAGGER = 90; // интервал между появлениями, мс
const COLLAGE_OFFSCREEN = 130; // стартовое смещение за экран, % от плитки

function showFinish() {
  finishEl.classList.add("active");
  finishEl.classList.remove("show-text");

  const board = document.getElementById("finishBoard");
  if (!board) return;
  board.innerHTML = "";

  const photos = FINAL_PHOTOS.length
    ? FINAL_PHOTOS
    : PEOPLE.map((p) => p.photo);

  renderCollage(board, photos);

  const totalDelay =
    COLLAGE_APPEAR_DELAY + (photos.length - 1) * COLLAGE_STAGGER + 700;
  setTimeout(() => {
    finishEl.classList.add("show-text");
    startCelebration(); // 🎉 конфетти + цветочки
  }, totalDelay);
}

/* ---------- Отрисовка с въездом со стороны ---------- */
function renderCollage(board, photos) {
  // Сетка в CSS: 2 колонки. Значит, чётные индексы — левая колонка,
  // нечётные — правая. Левая въезжает слева, правая — справа.
  const COLS = 2;

  photos.forEach((src, i) => {
    const el = document.createElement("div");
    el.className = "collage-item";
    el.style.backgroundImage = `url('${src}')`;

    const col = i % COLS;

    // Левая колонка — стартует слева, правая — справа.
    // Небольшое вертикальное разнообразие: чётные ряды сверху, нечётные снизу.
    const row = Math.floor(i / COLS);
    let tx = col === 0 ? -COLLAGE_OFFSCREEN : COLLAGE_OFFSCREEN;
    let ty = row % 2 === 0 ? -15 : 15;

    el.style.transform = `translate3d(${tx}%, ${ty}%, 0)`;
    el.style.opacity = "0";

    board.appendChild(el);

    void el.offsetWidth;

    const showAt = COLLAGE_APPEAR_DELAY + i * COLLAGE_STAGGER;
    setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "translate3d(0, 0, 0)";
    }, showAt);
  });
}

/* ================= Онбординг ================= */
function checkOnboarding() {
  const seen = localStorage.getItem("onboarding_seen");
  if (seen) onboardingEl.classList.add("hidden");
}
onboardingBtn.addEventListener("click", () => {
  localStorage.setItem("onboarding_seen", "1");
  onboardingEl.classList.add("hidden");
});

restartBtn.addEventListener("click", () => {
  stopCelebration();
  finishEl.classList.remove("active", "show-text");
  const board = document.getElementById("finishBoard");
  if (board) board.innerHTML = "";

  currentIndex = 0;
  renderDeck();
});

/* ================= Клавиатура ================= */
window.addEventListener("keydown", (e) => {
  if (isAnimating) return;
  if (e.key === "ArrowRight") goToNext();
  if (e.key === "ArrowLeft") goToPrev();
});

/* ================= Ресайз ================= */
window.addEventListener("resize", () => {
  renderDeck(false);

  // Пересчёт канваса конфетти, если он активен
  if (confettiCanvas && finishEl.classList.contains("active")) {
    const dpr = window.devicePixelRatio || 1;
    confettiCanvas.width = window.innerWidth * dpr;
    confettiCanvas.height = window.innerHeight * dpr;
    confettiCanvas.style.width = window.innerWidth + "px";
    confettiCanvas.style.height = window.innerHeight + "px";
    confettiCtx = confettiCanvas.getContext("2d");
    confettiCtx.scale(dpr, dpr);
  }
});

/* ================= Инициализация ================= */
checkOnboarding();
renderDeck();

/* ================================================================
   ПРАЗДНИЧНАЯ АНИМАЦИЯ — конфетти + цветочки
   ================================================================ */

const FLOWER_EMOJIS = [];

let confettiCtx = null;
let confettiParticles = [];
let confettiRAF = null;
let confettiCanvas = null;

/* ---------- Запуск всей праздничной анимации ---------- */
function startCelebration() {
  startConfetti();
  startFlowers();
}

/* ---------- Конфетти на canvas ---------- */
function startConfetti() {
  // Создаём канвас внутри .finish, если его ещё нет
  let canvas = finishEl.querySelector(".confetti-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    finishEl.appendChild(canvas);
  }
  confettiCanvas = canvas;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  confettiCtx = canvas.getContext("2d");
  confettiCtx.scale(dpr, dpr);

  // Палитра
  const colors = [
    "#ff4d8d",
    "#b14aff",
    "#ffd166",
    "#06d6a0",
    "#4cc9f0",
    "#f72585",
    "#ffb703",
    "#ffffff",
  ];

  const COUNT = 100;
  confettiParticles = [];

  for (let i = 0; i < COUNT; i++) {
    confettiParticles.push({
      x: Math.random() * window.innerWidth,
      y: -Math.random() * window.innerHeight,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 12,
      color: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.2,
      vy: 1.5 + Math.random() * 1.0,
      vx: (Math.random() - 0.5) * 1.2,
      shape: Math.random() < 0.6 ? "rect" : "circle",
      swing: Math.random() * Math.PI * 2,
      swingSpeed: 0.02 + Math.random() * 0.2,
    });
  }

  if (confettiRAF) cancelAnimationFrame(confettiRAF);

  const tick = () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    confettiCtx.clearRect(0, 0, W, H);

    let alive = 0;

    for (const p of confettiParticles) {
      p.swing += p.swingSpeed;
      p.x += p.vx + Math.sin(p.swing) * 0.8;
      p.y += p.vy;
      p.rot += p.vr;

      // Зацикливаем — частицы бесконечно падают сверху
      if (p.y > H + 40) {
        p.y = -40;
        p.x = Math.random() * W;
      }

      alive++;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rot);
      confettiCtx.fillStyle = p.color;
      confettiCtx.globalAlpha = 0.95;

      if (p.shape === "rect") {
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        confettiCtx.beginPath();
        confettiCtx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        confettiCtx.fill();
      }

      confettiCtx.restore();
    }

    confettiRAF = requestAnimationFrame(tick);
  };

  tick();
}

/* ---------- Цветочки ---------- */
function startFlowers() {
  // Если уже что-то есть — не спамим
  finishEl.querySelectorAll(".flower").forEach((n) => n.remove());

  const W = window.innerWidth;

  // Спавним 18 цветков с разными задержками
  const TOTAL = 18;
  for (let i = 0; i < TOTAL; i++) {
    const flower = document.createElement("span");
    flower.className = "flower";
    flower.textContent =
      FLOWER_EMOJIS[(Math.random() * FLOWER_EMOJIS.length) | 0];

    // Случайная позиция по ширине (в пределах 5%–95%)
    flower.style.left = 5 + Math.random() * (W * 0.9) + "px";
    flower.style.fontSize = 20 + Math.random() * 20 + "px";

    // Длительность падения
    const duration = 6 + Math.random() * 5; // 6–11 сек
    const delay = Math.random() * 3; // 0–3 сек
    flower.style.animationDuration = duration + "s";
    flower.style.animationDelay = delay + "s";

    // Разные направления дрейфа и вращения
    flower.style.setProperty(
      "--drift",
      (Math.random() * 160 - 80).toFixed(0) + "px",
    );
    flower.style.setProperty(
      "--spin",
      (Math.random() * 720 - 360).toFixed(0) + "deg",
    );

    // Некоторые цветы чуть прозрачнее
    flower.style.opacity = (0.7 + Math.random() * 0.3).toFixed(2);

    finishEl.appendChild(flower);

    // Удаляем после завершения анимации, чтобы не засорять DOM
    const lifeMs = (duration + delay) * 1000 + 500;
    setTimeout(() => flower.remove(), lifeMs);
  }

  // Повторный запуск цветов каждые ~9 секунд, пока финал открыт
  if (startFlowers._timer) clearTimeout(startFlowers._timer);
  const loop = () => {
    if (!finishEl.classList.contains("active")) return;
    startFlowers();
  };
  startFlowers._timer = setTimeout(loop, 9000);
}

/* ---------- Остановка анимации при закрытии финала ---------- */
function stopCelebration() {
  if (confettiRAF) {
    cancelAnimationFrame(confettiRAF);
    confettiRAF = null;
  }
  if (confettiCtx) {
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
  if (startFlowers._timer) {
    clearTimeout(startFlowers._timer);
    startFlowers._timer = null;
  }
  finishEl.querySelectorAll(".flower").forEach((n) => n.remove());
}
