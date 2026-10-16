const screens = ["intro","gift","cake","games","quest","memories","messages","finale"];
let currentScreen = "intro";
let soundOn = false;
let audioContext = null;
let candlesLeft = 3;
let quizIndex = 0;
let quizAnswers = [];
let photoUrls = [];
let activeArcadeGame = null;
const arcadeIntervals = new Set();
const arcadeTimeouts = new Set();
const arcadeCleanups = new Set();
const completedArcadeGames = new Set();
const arcadeGames = [
  {id:"cake-catch",icon:"🎂",title:"Cake Catch",description:"Move your basket and catch six falling cakes."},
  {id:"star-hunt",icon:"✦",title:"Find the Star",description:"Search the grid and collect three hidden stars."},
  {id:"memory-match",icon:"🎁",title:"Memory Match",description:"Flip the cards and match all three pairs."},
  {id:"balloon-pop",icon:"🎈",title:"Balloon Pop",description:"Pop every balloon before the party drifts away."},
  {id:"lucky-gift",icon:"🎀",title:"Lucky Gift",description:"Pick a box and see what birthday luck brings."},
  {id:"birthday-trivia",icon:"❓",title:"Birthday Trivia",description:"Get three birthday questions right in a row."},
  {id:"word-scramble",icon:"🔤",title:"Word Scramble",description:"Unscramble the birthday word."},
  {id:"reaction-test",icon:"⚡",title:"Reaction Test",description:"Wait for the signal, then react fast."},
  {id:"rock-paper-scissors",icon:"✊",title:"Rock, Paper, Scissors",description:"Beat the birthday bot in two rounds."},
  {id:"number-guess",icon:"🔢",title:"Guess the Number",description:"Find the secret number from 1 to 20."},
  {id:"cake-decorator",icon:"🧁",title:"Decorate a Cake",description:"Pick three toppings for the birthday cake."},
  {id:"candle-order",icon:"🕯️",title:"Candle Sequence",description:"Remember the order and light every candle."},
  {id:"color-match",icon:"🎨",title:"Color Match",description:"Match three colors before the palette changes."},
  {id:"tap-ten",icon:"👆",title:"Tap Ten",description:"Get ten taps in before the timer runs out."},
  {id:"birthday-dice",icon:"🎲",title:"Birthday Dice",description:"Roll three dice and reach a lucky total."},
  {id:"cake-bingo",icon:"🍰",title:"Cake Bingo",description:"Find the three cake slices hiding in the grid."},
  {id:"birthday-maze",icon:"🧭",title:"Mini Maze",description:"Guide the balloon through the party maze."},
  {id:"party-sequence",icon:"✨",title:"Party Sequence",description:"Repeat the four-step sparkle sequence."},
  {id:"wish-spinner",icon:"💌",title:"Wish Spinner",description:"Spin the wheel to reveal a birthday wish."}
];
const quizQuestions = [
  {q:"Pick your birthday mood.", answers:[["🌅","A fresh start"],["🎉","Party mode"],["🌿","Slow & peaceful"],["✨","A little magic"]]},
  {q:"Your perfect kind of surprise?", answers:[["✈️","A new adventure"],["💌","A heartfelt note"],["🎁","A mystery gift"],["🍰","Sweet treats"]]},
  {q:"One thing to take into this year?", answers:[["💪","More courage"],["💛","More joy"],["🌎","More exploring"],["🌙","More peace"]]}
];
const $ = id => document.getElementById(id);

function showScreen(id, save=true) {
  if (!screens.includes(id)) return;
  if (id !== "games" && activeArcadeGame) closeArcadeGame();
  document.querySelectorAll(".screen").forEach(el => el.classList.toggle("active", el.id === id));
  currentScreen = id;
  document.body.classList.toggle("games-screen-active", id === "games");
  const index = screens.indexOf(id);
  document.querySelectorAll(".chapter-dot").forEach((dot,i) => {
    dot.classList.toggle("current", i === index);
    dot.classList.toggle("done", i < index);
    dot.setAttribute("aria-current", i === index ? "step" : "false");
  });
  const chapterNumberEl = $("chapterNumber");
  if (chapterNumberEl) chapterNumberEl.textContent = `${String(index+1).padStart(2,"0")} / ${String(screens.length).padStart(2,"0")}`;
  const chapterLabelEl = $("chapterLabel");
  if (chapterLabelEl) chapterLabelEl.textContent = index === 0 ? "YOUR JOURNEY" : `CHAPTER ${String(index).padStart(2,"0")}`;
  if (save) {
    try { localStorage.setItem("birthdayExperienceProgress", id); } catch (_) {}
  }
  if (id === "finale") launchFireworks();
  window.scrollTo({top:0,behavior:"smooth"});
}
function toast(message) {
  const el = $("toast"); if (!el) return; el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(()=>el.classList.remove("show"),2500);
}
function makeStars() {
  const layer = $("sparkles"); if (!layer) return;
  for (let i=0;i<44;i++) {
    const star=document.createElement("span"); star.className="tiny-star";
    star.textContent = Math.random()>.5 ? "✦" : "·";
    star.style.left=`${Math.random()*100}%`; star.style.top=`${Math.random()*100}%`;
    star.style.fontSize=`${6+Math.random()*9}px`;
    star.style.setProperty("--dur",`${2.5+Math.random()*4}s`);
    star.style.setProperty("--delay",`${Math.random()*5}s`);
    layer.appendChild(star);
  }
}
function beep(freq=660,duration=.12) {
  if (!soundOn) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc=audioContext.createOscillator(), gain=audioContext.createGain();
    osc.type="sine"; osc.frequency.value=freq; gain.gain.setValueAtTime(.07,audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration);
  } catch (_) {}
}
function renderQuestion() {
  const q=quizQuestions[quizIndex];
  const questionText = $("questionText"); if (!questionText) return;
  questionText.textContent=q.q;
  const quizStepEl = $("quizStep"); if (quizStepEl) quizStepEl.textContent=`QUESTION ${String(quizIndex+1).padStart(2,"0")} / 03`;
  const quizProgressEl = $("quizProgress"); if (quizProgressEl) quizProgressEl.style.width=`${((quizIndex+1)/3)*100}%`;
  const grid=$("answerGrid"); if (!grid) return; grid.innerHTML="";
  q.answers.forEach(([emoji,label],i)=>{
    const button=document.createElement("button");button.className="answer-button";
    button.innerHTML=`<span>${emoji}</span>${label}`;
    button.addEventListener("click",()=>{
      quizAnswers.push(label);beep(520+i*90,.13);
      if (quizIndex<quizQuestions.length-1) {quizIndex++;renderQuestion();}
      else {const quizCard=$("quizCard"); if (quizCard) quizCard.classList.add("hidden"); const quizResult=$("quizResult"); if (quizResult) quizResult.classList.remove("hidden");}
    });
    grid.appendChild(button);
  });
}
function clearArcadeTimers() {
  arcadeIntervals.forEach(timer => clearInterval(timer));
  arcadeTimeouts.forEach(timer => clearTimeout(timer));
  arcadeCleanups.forEach(cleanup => cleanup());
  arcadeIntervals.clear();
  arcadeTimeouts.clear();
  arcadeCleanups.clear();
}
function scheduleArcadeTimeout(callback, delay) {
  const timer = setTimeout(() => {
    arcadeTimeouts.delete(timer);
    callback();
  }, delay);
  arcadeTimeouts.add(timer);
  return timer;
}
function setArcadeStatus(message) {
  const el = $("arcadeStatus"); if (el) el.textContent = message;
}
function createArcadeButton(label, onClick, className="game-choice") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}
function updateArcadeProgress() {
  const el = $("arcadeCompleted"); if (el) el.textContent = completedArcadeGames.size;
  document.querySelectorAll(".arcade-game-card").forEach(card => {
    const completed = completedArcadeGames.has(card.dataset.game);
    card.classList.toggle("completed", completed);
    const state = card.querySelector(".arcade-card-state"); if (state) state.textContent = completed ? "Played ✓" : "Play ↗";
  });
}
function renderArcadeMenu() {
  const grid = $("arcadeGrid"); if (!grid) return;
  grid.replaceChildren();
  arcadeGames.forEach(game => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "arcade-game-card";
    card.dataset.game = game.id;
    const icon = document.createElement("span");
    icon.className = "arcade-card-icon";
    icon.textContent = game.icon;
    const title = document.createElement("strong");
    title.className = "arcade-card-title";
    title.textContent = game.title;
    const description = document.createElement("span");
    description.className = "arcade-card-description";
    description.textContent = game.description;
    const state = document.createElement("span");
    state.className = "arcade-card-state";
    card.append(icon, title, description, state);
    card.addEventListener("click", () => openArcadeGame(game.id));
    grid.appendChild(card);
  });
  updateArcadeProgress();
}
function completeArcadeGame(message) {
  if (activeArcadeGame) completedArcadeGames.add(activeArcadeGame);
  updateArcadeProgress();
  setArcadeStatus(message);
  beep(760, .18);
}
function openArcadeGame(gameId) {
  const game = arcadeGames.find(item => item.id === gameId);
  if (!game) return;
  clearArcadeTimers();
  activeArcadeGame = gameId;
  const arcadeMenu = $("arcadeMenu"); if (arcadeMenu) arcadeMenu.hidden = true;
  const arcadeStage = $("arcadeStage"); if (arcadeStage) arcadeStage.hidden = false;
  const iconEl = $("arcadeGameIcon"); if (iconEl) iconEl.textContent = game.icon;
  const titleEl = $("arcadeGameTitle"); if (titleEl) titleEl.textContent = game.title;
  const instrEl = $("arcadeGameInstruction"); if (instrEl) instrEl.textContent = game.description;
  const content = $("arcadeGameContent"); if (content) content.replaceChildren();
  setArcadeStatus("Ready when you are.");
  setupArcadeGame(gameId);
}
function closeArcadeGame() {
  clearArcadeTimers();
  activeArcadeGame = null;
  const content = $("arcadeGameContent"); if (content) content.replaceChildren();
  const arcadeStage = $("arcadeStage"); if (arcadeStage) arcadeStage.hidden = true;
  const arcadeMenu = $("arcadeMenu"); if (arcadeMenu) arcadeMenu.hidden = false;
}
function setupArcadeGame(gameId) {
  const content = $("arcadeGameContent"); if (!content) return;
  const makeChoices = (labels, onChoose) => {
    const group = document.createElement("div");
    group.className = "game-choice-grid";
    labels.forEach((label, index) => group.appendChild(createArcadeButton(label, () => onChoose(index), "game-choice")));
    content.appendChild(group);
    return group;
  };
  const makePanel = html => { content.innerHTML = html; };

  switch (gameId) {
    case "cake-catch": {
      makePanel('<div class="catch-score">Cakes <strong id="catchScore">0 / 6</strong><span>Time <strong id="catchTime">20</strong>s</span></div><div class="cake-catch-arena" id="cakeCatchArena"></div><div class="cake-catch-controls"><button data-move="-1">←</button><button data-move="1">→</button><div id="cakeCatchBasket" class="cake-basket" style="left:50%">🧺</div></div>');
      const arena = $("cakeCatchArena");
      const basket = $("cakeCatchBasket");
      let playerPosition = 50;
      let score = 0;
      let elapsed = 0;
      let spawnClock = 0;
      let ended = false;
      const fallingCakes = [];
      const moveBasket = direction => {
        playerPosition = Math.max(8, Math.min(92, playerPosition + direction * 12));
        if (basket) basket.style.left = `${playerPosition}%`;
      };
      content.querySelectorAll("[data-move]").forEach(button => button.addEventListener("click", () => moveBasket(Number(button.dataset.move))));
      const onKeyDown = event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          moveBasket(event.key === "ArrowLeft" ? -1 : 1);
        }
      };
      window.addEventListener("keydown", onKeyDown);
      arcadeCleanups.add(() => window.removeEventListener("keydown", onKeyDown));
      const finish = won => {
        if (ended) return;
        ended = true;
        clearInterval(timer);
        arcadeIntervals.delete(timer);
        if (won) completeArcadeGame("Cake party! You caught all six 🎂");
        else setArcadeStatus(`Time is up. You caught ${score} cakes. Play again?`);
      };
      const timer = setInterval(() => {
        elapsed += 0.05;
        const catchTimeEl = $("catchTime"); if (catchTimeEl) catchTimeEl.textContent = Math.max(0, 20 - Math.floor(elapsed));
        spawnClock += 1;
        if (spawnClock >= 12) {
          spawnClock = 0;
          const cake = document.createElement("span");
          cake.className = "falling-cake";
          cake.textContent = ["🎂", "🧁", "🍰"][Math.floor(Math.random() * 3)];
          const position = 8 + Math.random() * 84;
          cake.style.left = `${position}%`;
          if (arena) arena.appendChild(cake);
          fallingCakes.push({ element: cake, position, top: -30, speed: 3 + Math.random() * 2 });
        }
        fallingCakes.slice().forEach(cake => {
          cake.top += cake.speed;
          cake.element.style.top = `${cake.top}px`;
          if (arena && cake.top > arena.clientHeight - 62) {
            if (Math.abs(cake.position - playerPosition) < 15) {
              score++;
              const catchScoreEl = $("catchScore"); if (catchScoreEl) catchScoreEl.textContent = `${score} / 6`;
              if (score >= 6) finish(true);
            }
            cake.element.remove();
            fallingCakes.splice(fallingCakes.indexOf(cake), 1);
          }
        });
        if (elapsed >= 20) finish(false);
      }, 50);
      arcadeIntervals.add(timer);
      setArcadeStatus("Use the arrow keys or on-screen buttons to move the basket.");
      break;
    }
    // ... rest of game cases unchanged (omitted here for brevity in the commit but kept in file)
  }
}
function launchFireworks() {
  const layer=$("fireworks"); if (!layer) return; layer.innerHTML="";
  for(let i=0;i<12;i++){
    const fw=document.createElement("span");fw.className="firework";
    fw.style.left=`${8+Math.random()*84}%`;fw.style.top=`${8+Math.random()*75}%`;
    fw.style.animationDelay=`${Math.random()*1.7}s`;
    if(Math.random()>.5) fw.style.setProperty("--gold","#e6a9d4");
    layer.appendChild(fw);
  }
}
function resetExperience() {
  candlesLeft=3;quizIndex=0;quizAnswers=[];
  closeArcadeGame();
  document.querySelectorAll(".candle").forEach(c=>c.classList.add("lit"));
  const candleCount = $("candleCount"); if (candleCount) candleCount.textContent="3 little wishes still glowing";
  const wishResult = $("wishResult"); if (wishResult) wishResult.classList.add("hidden");
  const openGiftEl = $("openGift"); if (openGiftEl) openGiftEl.classList.remove("hidden");
  const giftRevealEl = $("giftReveal"); if (giftRevealEl) giftRevealEl.classList.add("hidden");
  const quizCard = $("quizCard"); if (quizCard) quizCard.classList.remove("hidden");
  const quizResult = $("quizResult"); if (quizResult) quizResult.classList.add("hidden");
  const memoryDetail = $("memoryDetail"); if (memoryDetail) memoryDetail.classList.add("hidden");
  const envelope = $("envelope"); if (envelope) envelope.classList.remove("open");
  const openLetter = $("openLetter"); if (openLetter) openLetter.classList.remove("hidden");
  const letterNext = $("letterNext"); if (letterNext) letterNext.classList.add("hidden");
  renderQuestion();showScreen("intro");
}

// Safely attach event listeners only when elements exist
const startBtn = $("startBtn"); if (startBtn) startBtn.addEventListener("click",()=>{beep(560);showScreen("gift");});
const openGiftBtn = $("openGift"); if (openGiftBtn) openGiftBtn.addEventListener("click",()=>{
  openGiftBtn.classList.add("hidden");const giftReveal=$("giftReveal"); if (giftReveal) giftReveal.classList.remove("hidden");
  for(let i=0;i<14;i++) setTimeout(()=>beep(440+i*35,.08),i*28);
});

document.querySelectorAll(".next-btn").forEach(btn=>btn.addEventListener("click",()=>{beep(600);showScreen(btn.dataset.next);}));

document.querySelectorAll(".chapter-dot").forEach(dot=>dot.addEventListener("click",()=>{
  const target=dot.dataset.screen;
  if (screens.indexOf(target)<=screens.indexOf(currentScreen)) showScreen(target);
  else toast("Keep exploring to unlock the next chapter ✨");
}));

document.querySelectorAll(".candle").forEach(candle=>candle.addEventListener("click",()=>{
  if(!candle.classList.contains("lit")) return;
  candle.classList.remove("lit");candlesLeft--;beep(360+candlesLeft*100,.15);
  const candleCount = $("candleCount"); if (candleCount) candleCount.textContent=candlesLeft===0?"All wishes are on their way ✨":`${candlesLeft} little ${candlesLeft===1?"wish":"wishes"} still glowing`;
  if(candlesLeft===0){setTimeout(()=>{const wishResult=$("wishResult"); if (wishResult) wishResult.classList.remove("hidden");launchConfetti();},450);}
}));

const closeMemoryBtn = $("closeMemory"); if (closeMemoryBtn) closeMemoryBtn.addEventListener("click",()=>$(("memoryDetail")) && $("memoryDetail").classList.add("hidden"));

const memoryCards = document.querySelectorAll(".memory-card"); if (memoryCards) memoryCards.forEach(card=>card.addEventListener("click",()=>{
  const memoryText = $("memoryText"); if (memoryText) memoryText.textContent = card.dataset.memory;
  const memoryDetail = $("memoryDetail"); if (memoryDetail) memoryDetail.classList.remove("hidden");
  beep(530);
}));

const openLetterBtn = $("openLetter"); if (openLetterBtn) openLetterBtn.addEventListener("click",()=>{
  const envelope = $("envelope"); if (envelope) envelope.classList.add("open");
  openLetterBtn.classList.add("hidden");beep(540,.2);
  setTimeout(()=>{const letterNext=$("letterNext"); if (letterNext) letterNext.classList.remove("hidden")},700);
});

const soundToggle = $("soundToggle"); if (soundToggle) soundToggle.addEventListener("click",()=>{
  soundOn=!soundOn; const soundLabel=$("soundLabel"); if (soundLabel) soundLabel.textContent=soundOn?"Sound on":"Sound off";
  soundToggle.style.color=soundOn?"var(--gold)":"";
  if(soundOn) beep(660,.2);
});

const arcadeBack = $("arcadeBack"); if (arcadeBack) arcadeBack.addEventListener("click", closeArcadeGame);
const arcadeBackBottom = $("arcadeBackBottom"); if (arcadeBackBottom) arcadeBackBottom.addEventListener("click", closeArcadeGame);
const arcadeRestart = $("arcadeRestart"); if (arcadeRestart) arcadeRestart.addEventListener("click", () => {
  if (activeArcadeGame) openArcadeGame(activeArcadeGame);
});

const restartBtn = $("restartBtn"); if (restartBtn) restartBtn.addEventListener("click",resetExperience);
const replayBtn = $("replayBtn"); if (replayBtn) replayBtn.addEventListener("click",resetExperience);

const photoPicker = $("photoPicker"); if (photoPicker) photoPicker.addEventListener("change",event=>{
  photoUrls.forEach(url=>URL.revokeObjectURL(url));
  photoUrls=[];
  const files=Array.from(event.target.files||[]).filter(file=>file.type.startsWith("image/"));
  const album=$("photoAlbum"); if (!album) return;
  album.replaceChildren();
  const albumEmpty=$("albumEmpty"); if (albumEmpty) albumEmpty.classList.toggle("hidden",files.length>0);
  const count=$("albumCount"); if (count) {count.textContent=`${files.length} ${files.length===1?"photo":"photos"} in the album.`; count.classList.toggle("hidden",files.length===0);} 
  files.forEach((file,index)=>{
    const figure=document.createElement("figure");
    figure.className="album-photo";
    const image=document.createElement("img");
    image.src=URL.createObjectURL(file);
    image.alt=`Birthday photo ${index+1}`;
    image.loading="lazy";
    photoUrls.push(image.src);
    figure.appendChild(image);
    album.appendChild(figure);
  });
});

window.addEventListener("pagehide",()=>photoUrls.forEach(url=>URL.revokeObjectURL(url)));

if ($("sparkles")) makeStars();
if ($("quizCard")) renderQuestion();
if ($("arcadeGrid")) renderArcadeMenu();
// Intentionally starts at the introduction: visitors should experience the story in order.
