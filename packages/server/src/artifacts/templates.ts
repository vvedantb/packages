import { embedJsonInScript } from "./protocol.js";

// Built-in renderers for typed artifacts. The pages are offline HTML that keep
// progress in `window.artifactState`. The parsers here are lenient (they also
// take a bare array, and `question` for `prompt`) so older bodies still render
// without zod; `createArtifactSchemas` holds the strict v1 contract for writes.

export type Flashcard = {
  id: string;
  front: string;
  back: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type ArtifactTemplateName = "quiz" | "flashcards";

function isPlainObject(
  value: object | string | number | boolean | null,
): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonRoot(
  raw: string,
):
  | { kind: "array"; items: object[] }
  | { kind: "object"; value: object }
  | undefined {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
  try {
    const value: object | string | number | boolean | null =
      JSON.parse(trimmed);
    if (Array.isArray(value)) {
      const items: object[] = [];
      for (let i = 0; i < value.length; i += 1) {
        const item: object | string | number | boolean | null = value[i];
        if (!isPlainObject(item)) return undefined;
        items.push(item);
      }
      return { kind: "array", items };
    }
    if (isPlainObject(value)) return { kind: "object", value };
    return undefined;
  } catch {
    return undefined;
  }
}

function stringField(obj: object, key: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return undefined;
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  if (!desc || typeof desc.value !== "string") return undefined;
  const text = desc.value.trim();
  return text.length > 0 ? text : undefined;
}

function numberField(obj: object, key: string): number | undefined {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return undefined;
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  if (!desc || typeof desc.value !== "number" || !Number.isFinite(desc.value)) {
    return undefined;
  }
  return desc.value;
}

function arrayField(
  obj: object,
  key: string,
): Array<object | string | number | boolean | null> | undefined {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return undefined;
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  if (!desc || !Array.isArray(desc.value)) return undefined;
  const list: Array<object | string | number | boolean | null> = [];
  const raw: Array<object | string | number | boolean | null> = desc.value;
  for (let i = 0; i < raw.length; i += 1) {
    const item: object | string | number | boolean | null = raw[i];
    list.push(item);
  }
  return list;
}

function parseCard(obj: object, index: number): Flashcard | undefined {
  const front = stringField(obj, "front");
  const back = stringField(obj, "back");
  if (!front || !back) return undefined;
  return { id: stringField(obj, "id") ?? String(index), front, back };
}

function parseCardList(items: object[]): Flashcard[] | undefined {
  const cards: Flashcard[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item) return undefined;
    const card = parseCard(item, i);
    if (!card) return undefined;
    cards.push(card);
  }
  return cards.length > 0 ? cards : undefined;
}

function parseQuestion(
  obj: object,
  index: number,
): QuizQuestion | undefined {
  const prompt = stringField(obj, "prompt") ?? stringField(obj, "question");
  const correctIndex = numberField(obj, "correctIndex");
  const optionsRaw = arrayField(obj, "options");
  if (!prompt || correctIndex === undefined || !optionsRaw) return undefined;
  const options: string[] = [];
  for (const option of optionsRaw) {
    if (typeof option !== "string" || option.trim().length === 0)
      return undefined;
    options.push(option.trim());
  }
  if (options.length < 2 || options.length > 5) return undefined;
  if (
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex >= options.length
  ) {
    return undefined;
  }
  return {
    id: stringField(obj, "id") ?? String(index),
    prompt,
    options,
    correctIndex,
  };
}

function parseQuestionList(items: object[]): QuizQuestion[] | undefined {
  const questions: QuizQuestion[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item) return undefined;
    const question = parseQuestion(item, i);
    if (!question) return undefined;
    questions.push(question);
  }
  return questions.length > 0 ? questions : undefined;
}

export function parseFlashcardsTemplate(
  raw: string,
): { title?: string; cards: Flashcard[] } | undefined {
  const root = parseJsonRoot(raw);
  if (!root) return undefined;
  if (root.kind === "array") {
    const cards = parseCardList(root.items);
    if (!cards) return undefined;
    return { cards };
  }
  const cardsRaw = arrayField(root.value, "cards");
  if (!cardsRaw) return undefined;
  const items: object[] = [];
  for (const item of cardsRaw) {
    if (!isPlainObject(item)) return undefined;
    items.push(item);
  }
  const cards = parseCardList(items);
  if (!cards) return undefined;
  return { title: stringField(root.value, "title"), cards };
}

export function parseQuizTemplate(
  raw: string,
): { title?: string; questions: QuizQuestion[] } | undefined {
  const root = parseJsonRoot(raw);
  if (!root) return undefined;
  if (root.kind === "array") {
    const questions = parseQuestionList(root.items);
    if (!questions) return undefined;
    return { questions };
  }
  const questionsRaw = arrayField(root.value, "questions");
  if (!questionsRaw) return undefined;
  const items: object[] = [];
  for (const item of questionsRaw) {
    if (!isPlainObject(item)) return undefined;
    items.push(item);
  }
  const questions = parseQuestionList(items);
  if (!questions) return undefined;
  return { title: stringField(root.value, "title"), questions };
}

export function htmlFromArtifactTemplate(args: {
  title: string;
  content: string;
  template?: ArtifactTemplateName;
}): string | undefined {
  if (args.template === "flashcards" || args.template === undefined) {
    const parsed = parseFlashcardsTemplate(args.content);
    if (parsed) {
      return buildFlashcardsHtml({
        title: parsed.title ?? args.title,
        cards: parsed.cards,
      });
    }
    if (args.template === "flashcards") return undefined;
  }
  if (args.template === "quiz" || args.template === undefined) {
    const parsed = parseQuizTemplate(args.content);
    if (parsed) {
      return buildQuizHtml({
        title: parsed.title ?? args.title,
        questions: parsed.questions,
      });
    }
  }
  return undefined;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SHARED_CSS = `:root{--bg:#f7f7f5;--fg:#1a1a1a;--muted:#5c5c57;--card:#fff;--line:#d9d9d4;--accent:#2f2f2a}
@media(prefers-color-scheme:dark){:root{--bg:#121212;--fg:#f2f2f2;--muted:#b3b3b3;--card:#1c1c1c;--line:#333;--accent:#ececec}}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);font-family:"Instrument Sans",system-ui,sans-serif}
button{font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:12px;min-height:44px;min-width:44px;padding:0 14px;cursor:pointer}
button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`;

export function buildFlashcardsHtml(args: {
  title: string;
  cards: Flashcard[];
}): string {
  const payload = embedJsonInScript(args.cards);
  const title = escapeHtml(args.title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} flashcards</title>
<style>
${SHARED_CSS}
.wrap{max-width:40rem;margin:0 auto;padding:1.25rem 1rem 2.5rem}
h1{font-size:1.25rem;font-weight:600;margin:0 0 .25rem}
.sub{color:var(--muted);margin:0 0 1rem;font-size:.9rem}
.stage{perspective:1200px;min-height:14rem;margin:1rem 0}
.card{position:relative;min-height:14rem;transform-style:preserve-3d;transition:transform .35s ease;background:transparent;border:0;width:100%;padding:0;border-radius:16px}
.card.flipped{transform:rotateY(180deg)}
.face{position:absolute;inset:0;backface-visibility:hidden;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:1.25rem;display:flex;align-items:center;justify-content:center;text-align:center;font-size:1.05rem;line-height:1.45}
.back{transform:rotateY(180deg)}
.row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
#status{color:var(--muted)}
</style>
</head>
<body>
<div class="wrap">
<h1>${title} flashcards</h1>
<p class="sub">Progress is saved so chat can see which cards you know.</p>
<p id="status" aria-live="polite"></p>
<div class="stage">
<button type="button" class="card" id="card" aria-pressed="false">
<span class="face front" id="front"></span>
<span class="face back" id="back"></span>
</button>
</div>
<div class="row">
<button type="button" id="prev">Previous</button>
<button type="button" id="flip">Flip</button>
<button type="button" id="next">Next</button>
<button type="button" id="shuffle">Shuffle</button>
<button type="button" id="known">Mark known</button>
</div>
</div>
<script type="application/json" id="data">${payload}</script>
<script>
(function(){
  var dataEl=document.getElementById("data");
  var cards=dataEl?JSON.parse(dataEl.textContent||"[]"):[];
  if(!cards.length){
    var s=document.getElementById("status");
    if(s)s.textContent="No cards";
    return;
  }
  var i=0,flipped=false,known=[],seen=0;
  var card=document.getElementById("card");
  var front=document.getElementById("front");
  var back=document.getElementById("back");
  var status=document.getElementById("status");
  function decode(raw,fallback){
    if(raw==null||raw==="")return fallback;
    try{return JSON.parse(raw);}catch(e){return fallback;}
  }
  function persist(){
    var st=window.artifactState;
    if(!st)return;
    st.set("index",i);
    st.set("known",known);
    st.set("seen",seen);
  }
  function show(){
    var c=cards[i];
    if(!c||!front||!back||!card||!status)return;
    front.textContent=c.front;
    back.textContent=c.back;
    flipped=false;
    card.classList.remove("flipped");
    card.setAttribute("aria-pressed","false");
    var mark=known.indexOf(c.id)>=0?" · known":"";
    status.textContent=(i+1)+" / "+cards.length+" · seen "+seen+mark;
  }
  function flip(){
    if(!card)return;
    flipped=!flipped;
    card.classList.toggle("flipped",flipped);
    card.setAttribute("aria-pressed",flipped?"true":"false");
  }
  function go(d){
    i=(i+d+cards.length)%cards.length;
    seen+=1;
    persist();
    show();
  }
  function shuffle(){
    for(var n=cards.length-1;n>0;n--){
      var j=Math.floor(Math.random()*(n+1));
      var t=cards[n];
      cards[n]=cards[j];
      cards[j]=t;
    }
    i=0;
    persist();
    show();
  }
  function markKnown(){
    var c=cards[i];
    if(!c)return;
    if(known.indexOf(c.id)<0)known.push(c.id);
    persist();
    show();
  }
  var prev=document.getElementById("prev");
  var next=document.getElementById("next");
  var flipBtn=document.getElementById("flip");
  var shuffleBtn=document.getElementById("shuffle");
  var knownBtn=document.getElementById("known");
  if(card)card.addEventListener("click",flip);
  if(flipBtn)flipBtn.addEventListener("click",function(e){e.stopPropagation();flip();});
  if(prev)prev.addEventListener("click",function(){go(-1);});
  if(next)next.addEventListener("click",function(){go(1);});
  if(shuffleBtn)shuffleBtn.addEventListener("click",shuffle);
  if(knownBtn)knownBtn.addEventListener("click",markKnown);
  document.addEventListener("keydown",function(e){
    if(e.key==="ArrowLeft")go(-1);
    else if(e.key==="ArrowRight")go(1);
    else if(e.key===" "||e.key==="Enter"){e.preventDefault();flip();}
  });
  async function boot(){
    var st=window.artifactState;
    if(st){
      var all=await st.getAll();
      var idx=decode(all&&all.index,0);
      if(typeof idx==="number"&&idx>=0&&idx<cards.length)i=idx;
      var kn=decode(all&&all.known,[]);
      if(Array.isArray(kn))known=kn.filter(function(id){return typeof id==="string";});
      var se=decode(all&&all.seen,0);
      if(typeof se==="number")seen=se;
    }
    show();
  }
  boot();
})();
</script>
</body>
</html>`;
}

export function buildQuizHtml(args: {
  title: string;
  questions: QuizQuestion[];
}): string {
  const payload = embedJsonInScript(args.questions);
  const title = escapeHtml(args.title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} quiz</title>
<style>
${SHARED_CSS}
.wrap{max-width:40rem;margin:0 auto;padding:1.25rem 1rem 2.5rem}
h1{font-size:1.25rem;font-weight:600;margin:0 0 .25rem}
.sub{color:var(--muted);margin:0 0 1rem;font-size:.9rem}
#prompt{font-size:1.05rem;line-height:1.45;margin:0 0 1rem}
.options{display:flex;flex-direction:column;gap:.5rem;margin:0 0 1rem}
.options button{text-align:left;width:100%}
.options button[aria-pressed="true"]{background:var(--accent);color:var(--bg)}
.options button.correct{outline:2px solid var(--accent)}
.options button.wrong{opacity:.6}
.row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
#status{color:var(--muted);margin:0 0 .75rem}
#score{font-weight:600;margin:0 0 1rem}
</style>
</head>
<body>
<div class="wrap">
<h1>${title} quiz</h1>
<p class="sub">Answers are saved so chat can tell you how you did.</p>
<p id="status" aria-live="polite"></p>
<p id="score" aria-live="polite"></p>
<p id="prompt"></p>
<div class="options" id="options" role="group"></div>
<div class="row">
<button type="button" id="prev">Previous</button>
<button type="button" id="next">Next</button>
<button type="button" id="submit">Submit</button>
<button type="button" id="retry">Retry</button>
</div>
</div>
<script type="application/json" id="data">${payload}</script>
<script>
(function(){
  var dataEl=document.getElementById("data");
  var questions=dataEl?JSON.parse(dataEl.textContent||"[]"):[];
  if(!questions.length){
    var s=document.getElementById("status");
    if(s)s.textContent="No questions";
    return;
  }
  var i=0,answers={},submitted=false,score=0;
  var promptEl=document.getElementById("prompt");
  var optionsEl=document.getElementById("options");
  var status=document.getElementById("status");
  var scoreEl=document.getElementById("score");
  function decode(raw,fallback){
    if(raw==null||raw==="")return fallback;
    try{return JSON.parse(raw);}catch(e){return fallback;}
  }
  function persist(){
    var st=window.artifactState;
    if(!st)return;
    st.set("answers",answers);
    st.set("currentIndex",i);
    st.set("submitted",submitted);
    st.set("score",score);
    st.set("total",questions.length);
  }
  function tally(){
    var n=0;
    for(var q=0;q<questions.length;q++){
      var item=questions[q];
      if(item&&answers[item.id]===item.correctIndex)n+=1;
    }
    return n;
  }
  function render(){
    var q=questions[i];
    if(!q||!promptEl||!optionsEl||!status||!scoreEl)return;
    promptEl.textContent=q.prompt;
    status.textContent=(i+1)+" / "+questions.length;
    scoreEl.textContent=submitted?("Score "+score+" / "+questions.length):"";
    optionsEl.innerHTML="";
    for(var n=0;n<q.options.length;n++){
      var btn=document.createElement("button");
      btn.type="button";
      btn.textContent=q.options[n];
      var chosen=answers[q.id];
      btn.setAttribute("aria-pressed",chosen===n?"true":"false");
      if(submitted){
        if(n===q.correctIndex)btn.className="correct";
        else if(chosen===n)btn.className="wrong";
      }
      btn.addEventListener("click",(function(idx){
        return function(){
          if(submitted)return;
          answers[q.id]=idx;
          persist();
          render();
        };
      })(n));
      optionsEl.appendChild(btn);
    }
  }
  function go(d){
    i=Math.max(0,Math.min(questions.length-1,i+d));
    persist();
    render();
  }
  var prev=document.getElementById("prev");
  var next=document.getElementById("next");
  var submitBtn=document.getElementById("submit");
  var retryBtn=document.getElementById("retry");
  if(prev)prev.addEventListener("click",function(){go(-1);});
  if(next)next.addEventListener("click",function(){go(1);});
  if(submitBtn)submitBtn.addEventListener("click",function(){
    submitted=true;
    score=tally();
    persist();
    render();
  });
  if(retryBtn)retryBtn.addEventListener("click",function(){
    answers={};
    submitted=false;
    score=0;
    i=0;
    persist();
    render();
  });
  async function boot(){
    var st=window.artifactState;
    if(st){
      var all=await st.getAll();
      var idx=decode(all&&all.currentIndex,0);
      if(typeof idx==="number"&&idx>=0&&idx<questions.length)i=idx;
      var ans=decode(all&&all.answers,{});
      if(ans&&typeof ans==="object")answers=ans;
      submitted=!!decode(all&&all.submitted,false);
      var sc=decode(all&&all.score,0);
      if(typeof sc==="number")score=sc;
      else score=tally();
    }
    render();
  }
  boot();
})();
</script>
</body>
</html>`;
}
