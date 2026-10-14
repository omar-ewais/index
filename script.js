const screens = ["intro","gift","cake","quest","memories","messages","finale"];
let currentScreen = "intro";
let soundOn = false;
let audioContext = null;
let candlesLeft = 3;
let quizIndex = 0;
let quizAnswers = [];
let photoUrls = [];
const quizQuestions = [
  {q:"Pick your birthday mood.", answers:[["🌅","A fresh start"],["🎉","Party mode"],["🌿","Slow & peaceful"],["✨","A little magic"]]},
  {q:"Your perfect kind of surprise?", answers:[["✈️","A new adventure"],["💌","A heartfelt note"],["🎁","A mystery gift"],["🍰","Sweet treats"]]},
  {q:"One thing to take into this year?", answers:[["💪","More courage"],["💛","More joy"],["🌎","More exploring"],["🌙","More peace"]]}
];
const $ = id => document.getElementById(id);

function showScreen(id, save=true) {
  if (!screens.includes(id)) return;
  document.querySelectorAll(".screen").forEach(el => el.classList.toggle("active", el.id === id));
  currentScreen = id;
  const index = screens.indexOf(id);
  document.querySelectorAll(".chapter-dot").forEach((dot,i) => {
    dot.classList.toggle("current", i === index);
    dot.classList.toggle("done", i < index);
    dot.setAttribute("aria-current", i === index ? "step" : "false");
  });
  $("chapterNumber").textContent = `${String(index+1).padStart(2,"0")} / 07`;
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
makeStars();renderQuestion();
// Intentionally starts at the introduction: visitors should experience the story in order.
