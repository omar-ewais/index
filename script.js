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
  $("chapterNumber").textContent = `${String(index+1).padStart(2,"0")} / ${String(screens.length).padStart(2,"0")}`;
  $("chapterLabel").textContent = index === 0 ? "YOUR JOURNEY" : `CHAPTER ${String(index).padStart(2,"0")}`;
  if (save) {
    try { localStorage.setItem("birthdayExperienceProgress", id); } catch (_) {}
  }
  if (id === "finale") launchFireworks();
  window.scrollTo({top:0,behavior:"smooth"});
}
function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(()=>el.classList.remove("show"),2500);
}
function makeStars() {
  const layer = $("sparkles");
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
  $("questionText").textContent=q.q;
  $("quizStep").textContent=`QUESTION ${String(quizIndex+1).padStart(2,"0")} / 03`;
  $("quizProgress").style.width=`${((quizIndex+1)/3)*100}%`;
  const grid=$("answerGrid");grid.innerHTML="";
  q.answers.forEach(([emoji,label],i)=>{
    const button=document.createElement("button");button.className="answer-button";
    button.innerHTML=`<span>${emoji}</span>${label}`;
    button.addEventListener("click",()=>{
      quizAnswers.push(label);beep(520+i*90,.13);
      if (quizIndex<quizQuestions.length-1) {quizIndex++;renderQuestion();}
      else {$("quizCard").classList.add("hidden");$("quizResult").classList.remove("hidden");}
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
  $("arcadeStatus").textContent = message;
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
  $("arcadeCompleted").textContent = completedArcadeGames.size;
  document.querySelectorAll(".arcade-game-card").forEach(card => {
    const completed = completedArcadeGames.has(card.dataset.game);
    card.classList.toggle("completed", completed);
    card.querySelector(".arcade-card-state").textContent = completed ? "Played ✓" : "Play ↗";
  });
}
function renderArcadeMenu() {
  const grid = $("arcadeGrid");
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
  $("arcadeMenu").hidden = true;
  $("arcadeStage").hidden = false;
  $("arcadeGameIcon").textContent = game.icon;
  $("arcadeGameTitle").textContent = game.title;
  $("arcadeGameInstruction").textContent = game.description;
  $("arcadeGameContent").replaceChildren();
  setArcadeStatus("Ready when you are.");
  setupArcadeGame(gameId);
}
function closeArcadeGame() {
  clearArcadeTimers();
  activeArcadeGame = null;
  $("arcadeGameContent").replaceChildren();
  $("arcadeStage").hidden = true;
  $("arcadeMenu").hidden = false;
}
function setupArcadeGame(gameId) {
  const content = $("arcadeGameContent");
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
      makePanel('<div class="catch-score">Cakes <strong id="catchScore">0 / 6</strong><span>Time <strong id="catchTime">20</strong>s</span></div><div class="cake-catch-arena" id="cakeCatchArena" tabindex="0" role="group" aria-label="Cake catching play area"><div class="cake-catch-basket" id="cakeCatchBasket">🧺</div></div><div class="catch-controls"><button type="button" data-move="-1" aria-label="Move basket left">←</button><button type="button" data-move="1" aria-label="Move basket right">→</button></div>');
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
        basket.style.left = `${playerPosition}%`;
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
        $("catchTime").textContent = Math.max(0, 20 - Math.floor(elapsed));
        spawnClock += 1;
        if (spawnClock >= 12) {
          spawnClock = 0;
          const cake = document.createElement("span");
          cake.className = "falling-cake";
          cake.textContent = ["🎂", "🧁", "🍰"][Math.floor(Math.random() * 3)];
          const position = 8 + Math.random() * 84;
          cake.style.left = `${position}%`;
          arena.appendChild(cake);
          fallingCakes.push({ element: cake, position, top: -30, speed: 3 + Math.random() * 2 });
        }
        fallingCakes.slice().forEach(cake => {
          cake.top += cake.speed;
          cake.element.style.top = `${cake.top}px`;
          if (cake.top > arena.clientHeight - 62) {
            if (Math.abs(cake.position - playerPosition) < 15) {
              score++;
              $("catchScore").textContent = `${score} / 6`;
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
    case "star-hunt": {
      makePanel('<strong class="game-counter" id="starHuntScore">0 / 3 stars</strong><div class="star-hunt-grid" id="starHuntGrid"></div>');
      let foundStars = 0;
      const renderRound = () => {
        const target = Math.floor(Math.random() * 9);
        const board = $("starHuntGrid");
        board.replaceChildren();
        for (let tileIndex = 0; tileIndex < 9; tileIndex++) {
          const tile = createArcadeButton("✧", () => {
            if (tileIndex === target) {
              tile.textContent = "✦";
              tile.classList.add("found");
              tile.disabled = true;
              foundStars++;
              $("starHuntScore").textContent = `${foundStars} / 3 stars`;
              if (foundStars === 3) completeArcadeGame("Three stars found. Birthday luck is on your side!");
              else {
                setArcadeStatus("You found one! A new star is hiding...");
                scheduleArcadeTimeout(renderRound, 650);
              }
            } else {
              tile.textContent = "·";
              tile.classList.add("missed");
              tile.disabled = true;
              setArcadeStatus("Not that tile. Keep looking.");
            }
          }, "star-tile");
          board.appendChild(tile);
        }
      };
      renderRound();
      setArcadeStatus("Tap a tile to find the hidden star.");
      break;
    }
    case "memory-match": {
      makePanel('<strong class="game-counter" id="memoryScore">0 / 3 pairs</strong><div class="memory-arcade-grid" id="memoryArcadeGrid"></div>');
      const symbols = ["🎁", "🎂", "🎈"];
      const cards = [...symbols, ...symbols].map((symbol, index) => ({ symbol, pair: index % symbols.length })).sort(() => Math.random() - .5);
      const selection = [];
      let locked = false;
      let matches = 0;
      cards.forEach((card, index) => {
        const tile = createArcadeButton("✧", () => {
          if (locked || tile.disabled || tile.classList.contains("flipped")) return;
          tile.textContent = card.symbol;
          tile.classList.add("flipped");
          selection.push({ tile, pair: card.pair });
          if (selection.length !== 2) return;
          const [firstCard, secondCard] = selection;
          if (firstCard.pair === secondCard.pair) {
            firstCard.tile.disabled = true;
            secondCard.tile.disabled = true;
            firstCard.tile.classList.add("matched");
            secondCard.tile.classList.add("matched");
            selection.length = 0;
            matches++;
            $("memoryScore").textContent = `${matches} / 3 pairs`;
            if (matches === 3) completeArcadeGame("All three pairs matched. Nice memory!");
            else setArcadeStatus("A match! Find the next pair.");
          } else {
            locked = true;
            setArcadeStatus("Not a pair. Try another combination.");
            scheduleArcadeTimeout(() => {
              [firstCard.tile, secondCard.tile].forEach(cardTile => {
                cardTile.classList.remove("flipped");
                cardTile.textContent = "✧";
              });
              selection.length = 0;
              locked = false;
            }, 750);
          }
        }, "memory-arcade-tile");
        tile.setAttribute("aria-label", `Birthday memory ${index + 1}`);
        $("memoryArcadeGrid").appendChild(tile);
      });
      setArcadeStatus("Flip two cards to find a matching pair.");
      break;
    }
    case "balloon-pop": {
      makePanel('<strong class="game-counter" id="balloonScore">0 / 8 popped</strong><div class="balloon-grid" id="balloonGrid"></div>');
      const balloons = ["🎈", "🎈", "🎈", "🎈", "🎈", "🎈", "🎈", "🎈"];
      balloons.forEach((balloon, index) => {
        const button = createArcadeButton(balloon, () => {
          button.textContent = "✦";
          button.classList.add("popped");
          button.disabled = true;
          const popped = $("balloonGrid").querySelectorAll("button:disabled").length;
          $("balloonScore").textContent = `${popped} / 8 popped`;
          if (popped === 8) completeArcadeGame("All the balloons popped. Let the party begin!");
        }, "balloon-button");
        button.setAttribute("aria-label", `Balloon ${index + 1}`);
        $("balloonGrid").appendChild(button);
      });
      setArcadeStatus("Tap each balloon to pop it.");
      break;
    }
    case "lucky-gift": {
      makePanel('<div class="gift-choice-grid" id="giftChoiceGrid"></div>');
      const luckyIndex = Math.floor(Math.random() * 3);
      [0, 1, 2].forEach(index => {
        const button = createArcadeButton("🎁", () => {
          button.textContent = index === luckyIndex ? "🎂" : "🧦";
          button.classList.add(index === luckyIndex ? "gift-winner" : "gift-miss");
          if (index === luckyIndex) completeArcadeGame("A birthday cake! You picked the lucky gift.");
          else setArcadeStatus("A silly surprise! You can try another box.");
        }, "gift-choice");
        $("giftChoiceGrid").appendChild(button);
      });
      setArcadeStatus("Choose a gift box. One has a birthday cake inside.");
      break;
    }
    case "birthday-trivia": {
      makePanel('<strong class="game-counter" id="triviaProgress">Question 1 / 3</strong><h4 id="triviaQuestion"></h4><div class="game-choice-grid" id="triviaChoices"></div>');
      const questions = [
        {question:"Which treat usually gets birthday candles?", options:["Cake", "Soup", "Salad"], answer:0},
        {question:"What do you make before blowing out candles?", options:["A wish", "A map", "A sandwich"], answer:0},
        {question:"Which balloon floats highest?", options:["The one full of helium", "The one full of sand", "The one with a hole"], answer:0}
      ];
      let questionIndex = 0;
      const renderQuestion = () => {
        const question = questions[questionIndex];
        $("triviaProgress").textContent = `Question ${questionIndex + 1} / 3`;
        $("triviaQuestion").textContent = question.question;
        const choices = $("triviaChoices");
        choices.replaceChildren();
        question.options.forEach((option, index) => choices.appendChild(createArcadeButton(option, () => {
          if (index !== question.answer) {
            setArcadeStatus("Not quite. Take another guess.");
            return;
          }
          questionIndex++;
          if (questionIndex === questions.length) completeArcadeGame("Birthday trivia champion!");
          else { setArcadeStatus("Correct! Next question."); renderQuestion(); }
        })));
      };
      renderQuestion();
      setArcadeStatus("Choose the right answer to move on.");
      break;
    }
    case "word-scramble": {
      makePanel('<p class="scrambled-word">Y T R A P</p><label class="game-input-label" for="scrambleInput">Your answer</label><div class="game-input-row"><input id="scrambleInput" class="game-input" maxlength="5" autocomplete="off" /><button class="game-action-button" id="scrambleCheck" type="button">Check</button></div>');
      $("scrambleCheck").addEventListener("click", () => {
        if ($("scrambleInput").value.trim().toUpperCase() === "PARTY") completeArcadeGame("That's it. Let the party start!");
        else setArcadeStatus("Almost! Try rearranging the letters.");
      });
      setArcadeStatus("Unscramble the letters to reveal the birthday word.");
      break;
    }
    case "reaction-test": {
      makePanel('<button class="reaction-button waiting" id="reactionButton" type="button" disabled>Wait for the signal…</button><p class="reaction-time" id="reactionTime">—</p>');
      let ready = false;
      let startedAt = 0;
      const button = $("reactionButton");
      const waitTime = 1100 + Math.random() * 1900;
      scheduleArcadeTimeout(() => {
        ready = true;
        startedAt = performance.now();
        button.disabled = false;
        button.classList.remove("waiting");
        button.classList.add("go");
        button.textContent = "NOW!";
      }, waitTime);
      button.addEventListener("click", () => {
        if (!ready) { setArcadeStatus("Too soon. Wait for the signal!"); return; }
        const reaction = Math.round(performance.now() - startedAt);
        $("reactionTime").textContent = `${reaction} ms`;
        completeArcadeGame(`You reacted in ${reaction} ms. Lightning fast!`);
        button.disabled = true;
      });
      setArcadeStatus("Keep your finger ready, but wait for NOW.");
      break;
    }
    case "rock-paper-scissors": {
      makePanel('<strong class="game-counter" id="rpsScore">You 0 · Bot 0</strong><div class="game-choice-grid" id="rpsChoices"></div>');
      const choices = ["✊ Rock", "✋ Paper", "✌️ Scissors"];
      const beats = [2, 0, 1];
      let playerWins = 0;
      let botWins = 0;
      choices.forEach((choice, index) => $("rpsChoices").appendChild(createArcadeButton(choice, () => {
        const botChoice = Math.floor(Math.random() * 3);
        if (index !== botChoice) {
          if (beats[index] === botChoice) playerWins++;
          else botWins++;
        }
        $("rpsScore").textContent = `You ${playerWins} · Bot ${botWins}`;
        setArcadeStatus(index === botChoice ? "A tie! Pick again." : `${choice.split(" ")[0]} vs ${choices[botChoice].split(" ")[0]}`);
        if (playerWins === 2) completeArcadeGame("You won the birthday showdown!");
        if (botWins === 2) setArcadeStatus("The bot got lucky. Play again for a rematch.");
      })));
      setArcadeStatus("First to two wins takes the party crown.");
      break;
    }
    case "number-guess": {
      makePanel('<p class="game-counter">A number from 1 to 20 is hiding.</p><div class="game-input-row"><input id="numberGuessInput" class="game-input" type="number" min="1" max="20" /><button class="game-action-button" id="numberGuessCheck" type="button">Guess</button></div>');
      const secretNumber = 1 + Math.floor(Math.random() * 20);
      $("numberGuessCheck").addEventListener("click", () => {
        const guess = Number($("numberGuessInput").value);
        if (!guess || guess < 1 || guess > 20) { setArcadeStatus("Enter a number from 1 to 20."); return; }
        if (guess === secretNumber) completeArcadeGame("Bullseye! You found the birthday number.");
        else setArcadeStatus(guess < secretNumber ? "A little higher ↑" : "A little lower ↓");
      });
      setArcadeStatus("Type a guess and follow the hints.");
      break;
    }
    case "cake-decorator": {
      makePanel('<div class="cake-preview" id="cakePreview">🎂</div><p class="game-counter" id="toppingCount">Choose 3 toppings</p><div class="game-choice-grid" id="toppingChoices"></div><button class="game-action-button" id="finishCake" type="button" disabled>Finish my cake</button>');
      const toppings = ["🍓", "🍒", "🍫", "🫐", "✨", "🍬"];
      const selected = new Set();
      toppings.forEach(topping => $("toppingChoices").appendChild(createArcadeButton(topping, event => {
        if (selected.has(topping)) selected.delete(topping);
        else if (selected.size < 3) selected.add(topping);
        event.currentTarget.classList.toggle("selected", selected.has(topping));
        $("toppingCount").textContent = `${selected.size} / 3 toppings chosen`;
        $("cakePreview").textContent = `🎂 ${[...selected].join(" ")}`;
        $("finishCake").disabled = selected.size !== 3;
      })));
      $("finishCake").addEventListener("click", () => completeArcadeGame("Your birthday cake is ready to share!"));
      setArcadeStatus("Pick three toppings, then finish your cake.");
      break;
    }
    case "candle-order": {
      const sequence = Array.from({length:4}, () => Math.floor(Math.random() * 4));
      makePanel(`<p class="game-counter">Remember this order: ${sequence.map(number => number + 1).join(" → ")}</p><div class="candle-choice-grid" id="candleChoiceGrid"></div>`);
      let nextCandle = 0;
      for (let candleIndex = 0; candleIndex < 4; candleIndex++) $("candleChoiceGrid").appendChild(createArcadeButton("🕯️", () => {
        if (candleIndex === sequence[nextCandle]) {
          nextCandle++;
          const button = $("candleChoiceGrid").children[candleIndex];
          button.classList.add("lit-correct");
          if (nextCandle === sequence.length) completeArcadeGame("Every candle lit in the right order!");
          else setArcadeStatus(`${nextCandle} of 4 candles in the right order.`);
        } else {
          nextCandle = 0;
          $("candleChoiceGrid").querySelectorAll("button").forEach(button => button.classList.remove("lit-correct"));
          setArcadeStatus("That wasn't next. Start the sequence again.");
        }
      }, "candle-choice"));
      setArcadeStatus("Tap the candles in the order shown.");
      break;
    }
    case "color-match": {
      const colors = [{name:"Rose",value:"#e6a9d4"},{name:"Gold",value:"#f3c978"},{name:"Mint",value:"#94d3b0"},{name:"Sky",value:"#86c8ed"}];
      makePanel('<div class="color-prompt" id="colorPrompt"></div><strong class="game-counter" id="colorScore">0 / 3 matches</strong><div class="color-choice-grid" id="colorChoiceGrid"></div>');
      let matches = 0;
      let targetColor;
      const renderColor = () => {
        targetColor = colors[Math.floor(Math.random() * colors.length)];
        $("colorPrompt").textContent = targetColor.name;
        $("colorPrompt").style.color = targetColor.value;
      };
      colors.forEach(color => {
        const button = createArcadeButton(color.name, () => {
          if (color === targetColor) {
            matches++;
            $("colorScore").textContent = `${matches} / 3 matches`;
            if (matches === 3) completeArcadeGame("Perfect palette! Three colors matched.");
            else { renderColor(); setArcadeStatus("Color matched. Keep going!"); }
          } else setArcadeStatus("Not that shade. Try again.");
        }, "color-choice");
        button.style.setProperty("--swatch", color.value);
        $("colorChoiceGrid").appendChild(button);
      });
      renderColor();
      setArcadeStatus("Choose the color shown above.");
      break;
    }
    case "tap-ten": {
      makePanel('<strong class="game-counter" id="tapScore">0 / 10 taps</strong><p class="game-counter" id="tapTimer">Timer starts on your first tap.</p><button class="tap-target" id="tapTarget" type="button">Tap!</button>');
      let taps = 0;
      let secondsLeft = 8;
      let started = false;
      let timer;
      $("tapTarget").addEventListener("click", () => {
        if (!started) {
          started = true;
          timer = setInterval(() => {
            secondsLeft--;
            $("tapTimer").textContent = `${secondsLeft} seconds left`;
            if (secondsLeft <= 0) {
              clearInterval(timer);
              arcadeIntervals.delete(timer);
              $("tapTarget").disabled = true;
              setArcadeStatus("Time! Hit Play again for another go.");
            }
          }, 1000);
          arcadeIntervals.add(timer);
        }
        if (secondsLeft <= 0) return;
        taps++;
        $("tapScore").textContent = `${taps} / 10 taps`;
        if (taps >= 10) {
          clearInterval(timer);
          arcadeIntervals.delete(timer);
          $("tapTarget").disabled = true;
          completeArcadeGame("Ten taps! Your party reflexes are ready.");
        }
      });
      setArcadeStatus("Tap the big button ten times as fast as you can.");
      break;
    }
    case "birthday-dice": {
      makePanel('<div class="dice-display" id="diceDisplay">🎲</div><strong class="game-counter" id="diceScore">Roll 3 times · Total 0</strong><button class="game-action-button" id="rollDice" type="button">Roll the dice</button>');
      let rolls = 0;
      let total = 0;
      $("rollDice").addEventListener("click", () => {
        const roll = 1 + Math.floor(Math.random() * 6);
        rolls++;
        total += roll;
        $("diceDisplay").textContent = ["⚀","⚁","⚂","⚃","⚄","⚅"][roll - 1];
        $("diceScore").textContent = `${rolls} / 3 rolls · Total ${total}`;
        if (rolls === 3) {
          $("rollDice").disabled = true;
          if (total >= 10) completeArcadeGame(`Lucky roll! Your total is ${total}.`);
          else setArcadeStatus(`You rolled ${total}. Need 10 or more. Play again!`);
        }
      });
      setArcadeStatus("Roll three times and aim for a total of 10.");
      break;
    }
    case "cake-bingo": {
      makePanel('<strong class="game-counter" id="bingoScore">0 / 3 cake slices</strong><div class="bingo-grid" id="bingoGrid"></div>');
      const cakeLocations = new Set();
      while (cakeLocations.size < 3) cakeLocations.add(Math.floor(Math.random() * 9));
      for (let tileIndex = 0; tileIndex < 9; tileIndex++) $("bingoGrid").appendChild(createArcadeButton("✧", event => {
        if (cakeLocations.has(tileIndex)) {
          event.currentTarget.textContent = "🍰";
          event.currentTarget.classList.add("found");
          event.currentTarget.disabled = true;
          const found = $("bingoGrid").querySelectorAll(".found").length;
          $("bingoScore").textContent = `${found} / 3 cake slices`;
          if (found === 3) completeArcadeGame("Cake bingo! You found every slice.");
        } else {
          event.currentTarget.textContent = "·";
          event.currentTarget.disabled = true;
          setArcadeStatus("No cake here. Try another square.");
        }
      }, "bingo-tile"));
      setArcadeStatus("Find all three cake slices hiding in the grid.");
      break;
    }
    case "birthday-maze": {
      makePanel('<div class="maze-board" id="mazeBoard"></div><div class="maze-controls"><button type="button" data-dx="0" data-dy="-1" aria-label="Move up">↑</button><button type="button" data-dx="-1" data-dy="0" aria-label="Move left">←</button><button type="button" data-dx="0" data-dy="1" aria-label="Move down">↓</button><button type="button" data-dx="1" data-dy="0" aria-label="Move right">→</button></div>');
      const walls = new Set([3, 4, 5, 7, 8, 9, 12, 13, 14]);
      let position = 0;
      const renderMaze = () => {
        const board = $("mazeBoard");
        board.replaceChildren();
        for (let cellIndex = 0; cellIndex < 16; cellIndex++) {
          const cell = document.createElement("span");
          cell.className = `maze-cell${walls.has(cellIndex) ? " wall" : ""}`;
          cell.textContent = cellIndex === position ? "🎈" : cellIndex === 15 ? "🎂" : "";
          board.appendChild(cell);
        }
      };
      content.querySelectorAll("[data-dx]").forEach(button => button.addEventListener("click", () => {
        const row = Math.floor(position / 4) + Number(button.dataset.dy);
        const column = position % 4 + Number(button.dataset.dx);
        if (row < 0 || row > 3 || column < 0 || column > 3) return;
        const destination = row * 4 + column;
        if (walls.has(destination)) { setArcadeStatus("A party wall! Try another way."); return; }
        position = destination;
        renderMaze();
        if (position === 15) completeArcadeGame("You found the cake at the end of the maze!");
      }));
      renderMaze();
      setArcadeStatus("Guide the balloon to the cake. Use the arrows.");
      break;
    }
    case "party-sequence": {
      const sequence = Array.from({length:4}, () => 1 + Math.floor(Math.random() * 4));
      makePanel(`<p class="sequence-clue">Remember: ${sequence.join(" · ")}</p><div class="sequence-grid" id="sequenceGrid"></div><strong class="game-counter" id="sequenceProgress">0 / 4</strong>`);
      let nextIndex = 0;
      for (let number = 1; number <= 4; number++) $("sequenceGrid").appendChild(createArcadeButton(String(number), () => {
        if (number === sequence[nextIndex]) {
          nextIndex++;
          $("sequenceProgress").textContent = `${nextIndex} / 4`;
          if (nextIndex === sequence.length) completeArcadeGame("Sequence complete. Sparkle memory unlocked!");
        } else {
          nextIndex = 0;
          $("sequenceProgress").textContent = "0 / 4";
          setArcadeStatus("Not quite. Try the sequence again.");
        }
      }, "sequence-button"));
      setArcadeStatus("Repeat the numbers in the same order.");
      break;
    }
    case "wish-spinner": {
      makePanel('<div class="wish-result-card" id="spinnerWish">✧</div><button class="game-action-button" id="spinWish" type="button">Spin for a wish</button>');
      const wishes = ["A year full of new adventures", "More laughter than you can count", "A cake for every good day", "A little magic in the ordinary", "Your biggest wish coming true"];
      $("spinWish").addEventListener("click", () => {
        const button = $("spinWish");
        button.disabled = true;
        $("spinnerWish").classList.add("spinning");
        scheduleArcadeTimeout(() => {
          $("spinnerWish").classList.remove("spinning");
          $("spinnerWish").textContent = wishes[Math.floor(Math.random() * wishes.length)];
          completeArcadeGame("Your birthday wish is on its way ✨");
        }, 850);
      });
      setArcadeStatus("Give the wheel a spin to reveal your wish.");
      break;
    }
  }
}
function launchFireworks() {
  const layer=$("fireworks");layer.innerHTML="";
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
  $("candleCount").textContent="3 little wishes still glowing";
  $("wishResult").classList.add("hidden");
  $("openGift").classList.remove("hidden");$("giftReveal").classList.add("hidden");
  $("quizCard").classList.remove("hidden");$("quizResult").classList.add("hidden");
  $("memoryDetail").classList.add("hidden");$("envelope").classList.remove("open");
  $("openLetter").classList.remove("hidden");$("letterNext").classList.add("hidden");
  renderQuestion();showScreen("intro");
}
$("startBtn").addEventListener("click",()=>{beep(560);showScreen("gift");});
$("openGift").addEventListener("click",()=>{
  $("openGift").classList.add("hidden");$("giftReveal").classList.remove("hidden");
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
  $("candleCount").textContent=candlesLeft===0?"All wishes are on their way ✨":`${candlesLeft} little ${candlesLeft===1?"wish":"wishes"} still glowing`;
  if(candlesLeft===0){setTimeout(()=>{$("wishResult").classList.remove("hidden");launchConfetti();},450);}
}));
function launchConfetti(){
  const colors=["#f3c978","#e6a9d4","#b7a2e8","#fff0d4"];
  for(let i=0;i<35;i++){
    const el=document.createElement("span");el.textContent=Math.random()>.5?"✦":"•";
    el.style.cssText=`position:fixed;z-index:20;left:${Math.random()*100}vw;top:-20px;color:${colors[i%colors.length]};font-size:${10+Math.random()*12}px;pointer-events:none;transition:transform ${1.4+Math.random()}s ease,opacity 1.5s;`;
    document.body.appendChild(el);
    requestAnimationFrame(()=>{el.style.transform=`translate(${(Math.random()-.5)*160}px,${window.innerHeight+60}px) rotate(${Math.random()*540}deg)`;el.style.opacity="0";});
    setTimeout(()=>el.remove(),2800);
  }
}
document.querySelectorAll(".memory-card").forEach(card=>card.addEventListener("click",()=>{
  $("memoryText").textContent=card.dataset.memory;$("memoryDetail").classList.remove("hidden");beep(530);
}));
$("closeMemory").addEventListener("click",()=>$("memoryDetail").classList.add("hidden"));
$("openLetter").addEventListener("click",()=>{
  $("envelope").classList.add("open");$("openLetter").classList.add("hidden");beep(540,.2);
  setTimeout(()=>$("letterNext").classList.remove("hidden"),700);
});
$("soundToggle").addEventListener("click",()=>{
  soundOn=!soundOn;$("soundLabel").textContent=soundOn?"Sound on":"Sound off";
  $("soundToggle").style.color=soundOn?"var(--gold)":"";
  if(soundOn) beep(660,.2);
});
$("arcadeBack").addEventListener("click", closeArcadeGame);
$("arcadeBackBottom").addEventListener("click", closeArcadeGame);
$("arcadeRestart").addEventListener("click", () => {
  if (activeArcadeGame) openArcadeGame(activeArcadeGame);
});
$("restartBtn").addEventListener("click",resetExperience);
$("replayBtn").addEventListener("click",resetExperience);
$("photoPicker").addEventListener("change",event=>{
  photoUrls.forEach(url=>URL.revokeObjectURL(url));
  photoUrls=[];
  const files=Array.from(event.target.files||[]).filter(file=>file.type.startsWith("image/"));
  const album=$("photoAlbum");
  album.replaceChildren();
  $("albumEmpty").classList.toggle("hidden",files.length>0);
  const count=$("albumCount");
  count.textContent=`${files.length} ${files.length===1?"photo":"photos"} in the album.`;
  count.classList.toggle("hidden",files.length===0);
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
makeStars();renderQuestion();renderArcadeMenu();
// Intentionally starts at the introduction: visitors should experience the story in order.
