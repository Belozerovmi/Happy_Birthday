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
    name: "Ирина Краснова",
    photo: "assets/photos/Ирина Краснова.jpg",
    audio: "assets/audio/Ирина Краснова.mp3",
  },
  {
    name: "Наталья Бигун",
    photo: "assets/photos/Наталья Бигун.jpg",
    audio: "assets/audio/Наталья Бигун.mp3",
  },
];
/* ============================================================
   ⬆️⬆️⬆️  КОНЕЦ РЕДАКТИРУЕМОГО БЛОКА  ⬆️⬆️⬆️
   ============================================================ */

const deckEl = document.getElementById("deck");
const onboardingEl = document.getElementById("onboarding");
const onboardingBtn = document.getElementById("onboardingBtn");
const finishEl = document.getElementById("finish");
const restartBtn = document.getElementById("restartBtn");

const AUTO_NEXT_DELAY = 3000;
const SWIPE_THRESHOLD = 90; // минимальный сдвиг для зачёта свайпа
const ANIM_DURATION = 420; // мс — длительность анимации переезда

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

  // <div class="player__speed">
  //         <button data-speed="1" class="active">1x</button>
  //         <button data-speed="1.5">1.5x</button>
  //         <button data-speed="2">2x</button>
  //       </div>

  const audio = card.querySelector("audio");
  const toggleBtn = card.querySelector('[data-role="toggle"]');
  const progressFill = card.querySelector(".player__progress-fill");
  const progressEl = card.querySelector(".player__progress");
  const timeCur = card.querySelector(".player__time--current");
  const timeTotal = card.querySelector(".player__time--total");
  const speedBtns = card.querySelectorAll(".player__speed button");

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

  speedBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const speed = parseFloat(btn.dataset.speed);
      audio.playbackRate = speed;
      speedBtns.forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  return card;
}

/* ================================================================
   Позиционирование карточек
   ----------------------------------------------------------------
   Все карточки абсолютно спозиционированы в центре контейнера,
   а через transform мы сдвигаем их:
     offset = 0  → в центре
     offset > 0  → справа (следующие)
     offset < 0  → слева  (предыдущие)
   ================================================================ */

// На сколько пикселей вбок уходит следующая "заэкранная" карточка
function offscreenOffset() {
  return window.innerWidth + 80;
}

/**
 * Устанавливает позицию карточки.
 * @param {HTMLElement} card
 * @param {number} offset  — 0 = центр, +N = справа, -N = слева
 * @param {boolean} animate — анимировать ли
 */
function setCardPosition(card, offset, animate = false) {
  const cardEl = card;
  const w = offscreenOffset();

  let x, scale, opacity, rotate;

  if (offset === 0) {
    x = 0;
    scale = 1;
    opacity = 1;
    rotate = 0;
  } else {
    // Все ненулевые оффсеты — строго за экраном
    x = offset > 0 ? w : -w;
    scale = 0.9;
    opacity = 1; // пусть будет видно, когда выезжает
    rotate = offset > 0 ? 8 : -8; // лёгкий наклон для «ромашки»
  }

  if (animate) {
    cardEl.style.transition = `transform ${ANIM_DURATION}ms cubic-bezier(.22,.61,.36,1), opacity ${ANIM_DURATION}ms`;
  } else {
    cardEl.style.transition = "none";
  }

  cardEl.style.transform = `translate3d(${x}px, 0, 0) scale(${scale}) rotate(${rotate}deg)`;
  cardEl.style.opacity = opacity;

  // Скрываем с глаз те, что далеко за пределами
  cardEl.style.pointerEvents = offset === 0 ? "auto" : "none";
}

/* ================= Свайпы (жёсткая траектория) ================= */
function attachSwipe(card, index) {
  let startX = 0;
  let startY = 0;
  let curX = 0;
  let dragging = false;
  let pointerId = null;

  const onStart = (e) => {
    if (isAnimating) return;
    if (index !== currentIndex) return;

    const p = e.touches ? e.touches[0] : e;
    startX = p.clientX;
    startY = p.clientY;
    curX = 0;
    dragging = true;
    pointerId = e.pointerId ?? null;

    card.style.transition = "none";
  };

  const onMove = (e) => {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    curX = p.clientX - startX;
    const dy = p.clientY - startY;

    // Если движение больше вертикальное — не мешаем скроллу (тут его нет, но на будущее)
    if (Math.abs(dy) > Math.abs(curX) * 2 && Math.abs(curX) < 20) return;

    // Строгая траектория: только по X. Небольшой поворот — производная от X.
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
      // Возврат на место
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

/* ================================================================
   Главный переключатель — «ромашка» со строгой траекторией
   direction = -1  → свайп влево, вперёд
   direction =  1  → свайп вправо, назад
   ================================================================ */
function swipeTo(direction) {
  if (isAnimating) return;

  const goingForward = direction === -1;
  const target = goingForward ? currentIndex + 1 : currentIndex - 1;

  // Границы
  if (target < 0) {
    // Хотим назад, но это первая — просто возвращаем на место
    const card = getCardEl(currentIndex);
    if (card) setCardPosition(card, 0, true);
    return;
  }
  if (target >= PEOPLE.length) {
    showFinish();
    return;
  }

  isAnimating = true;

  const currentCard = getCardEl(currentIndex);
  const nextCard = ensureCard(target);

  const w = offscreenOffset();

  // 1. Текущая уезжает за экран в сторону свайпа
  if (currentCard) {
    currentCard.style.transition = `transform ${ANIM_DURATION}ms cubic-bezier(.22,.61,.36,1), opacity ${ANIM_DURATION}ms`;
    currentCard.style.transform = `translate3d(${direction * (w + 60)}px, 0, 0) rotate(${direction * 20}deg) scale(0.9)`;
    currentCard.style.opacity = "0";
    currentCard.style.pointerEvents = "none";

    // Пауза аудио текущей
    const a = currentCard.querySelector("audio");
    if (a) a.pause();
  }

  // 2. Следующая приходит из-за противоположного края в центр
  if (nextCard) {
    // Ставим её в стартовую позицию (за противоположным краем) без анимации
    setCardPosition(nextCard, goingForward ? 1 : -1, false);
    nextCard.style.opacity = "1";
    nextCard.style.pointerEvents = "none";
    // Форсируем reflow, чтобы браузер применил стартовое положение
    void nextCard.offsetWidth;

    // И отправляем в центр
    requestAnimationFrame(() => {
      setCardPosition(nextCard, 0, true);
    });
  }

  // 3. Финализируем состояние
  setTimeout(() => {
    currentIndex = target;
    isAnimating = false;
    renderDeck(true);
  }, ANIM_DURATION);
}

/* ================= Утилиты работы с карточками ================= */
function getCardEl(index) {
  return deckEl.querySelector(`.card[data-index="${index}"]`);
}

/**
 * Гарантированно создаёт карточку для индекса (если её нет в DOM).
 */
function ensureCard(index) {
  if (index < 0 || index >= PEOPLE.length) return null;
  let card = getCardEl(index);
  if (!card) {
    card = createCard(PEOPLE[index], index);
    deckEl.appendChild(card);
    // Изначально — за правым краем (если это будущая) или за левым (если прошлая)
    setCardPosition(card, index >= currentIndex ? 1 : -1, false);
    attachSwipe(card, index);
  }
  return card;
}

/* ================= Управление колодой ================= */
function renderDeck(animateCurrent = false) {
  // Убедимся, что текущая + соседние существуют
  ensureCard(currentIndex - 1);
  ensureCard(currentIndex);
  ensureCard(currentIndex + 1);

  // Расставим корректно всех, кто есть в DOM
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

  // Удаляем карточки, которые слишком далеко (экономия памяти и аудио)
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

function showFinish() {
  finishEl.classList.add("active");
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
  finishEl.classList.remove("active");
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
});

/* ================= Инициализация ================= */
checkOnboarding();
renderDeck();
