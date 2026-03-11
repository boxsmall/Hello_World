const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const STREET_NAMES = ["翻牌前", "翻牌", "转牌", "河牌", "摊牌"];
const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const BET_SIZE = 20;

const state = {
  deck: [],
  community: [],
  players: [],
  pot: 0,
  street: -1,
  currentBet: 0,
  handActive: false,
  revealAllCards: false,
  dealerIndex: 0,
  turnIndex: -1,
};

const els = {
  aiCount: document.getElementById("aiCount"),
  street: document.getElementById("street"),
  pot: document.getElementById("pot"),
  toCall: document.getElementById("toCall"),
  turn: document.getElementById("turn"),
  message: document.getElementById("message"),
  communityCards: document.getElementById("communityCards"),
  playersArea: document.getElementById("playersArea"),
  newHandBtn: document.getElementById("newHandBtn"),
  checkCallBtn: document.getElementById("checkCallBtn"),
  betRaiseBtn: document.getElementById("betRaiseBtn"),
  foldBtn: document.getElementById("foldBtn"),
};

function initPlayers() {
  const aiCount = Number(els.aiCount.value || 1);
  const oldMap = new Map(state.players.map((p) => [p.id, p]));
  const players = [{ id: "you", name: "你", isHuman: true }];
  for (let i = 1; i <= aiCount; i++) {
    players.push({ id: `ai${i}`, name: `电脑${i}`, isHuman: false });
  }
  state.players = players.map((base) => {
    const prev = oldMap.get(base.id);
    return {
      ...base,
      chips: prev ? prev.chips : STARTING_CHIPS,
      hand: [],
      bet: 0,
      folded: false,
      allIn: false,
      acted: false,
      inHand: false,
    };
  });
  state.dealerIndex = Math.min(state.dealerIndex, state.players.length - 1);
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit, value: RANKS.indexOf(rank) + 2 });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawCard() { return state.deck.pop(); }

function cardHtml(card, hidden = false) {
  if (hidden) return '<div class="card back"></div>';
  const red = card.suit === "♥" || card.suit === "♦" ? "red" : "";
  return `<div class="card ${red}">${card.rank}${card.suit}</div>`;
}

function render() {
  els.street.textContent = state.street >= 0 ? STREET_NAMES[state.street] : "-";
  els.pot.textContent = state.pot;

  const you = state.players.find((p) => p.isHuman);
  const toCall = you ? Math.max(0, state.currentBet - you.bet) : 0;
  els.toCall.textContent = toCall;
  els.turn.textContent = state.handActive && state.turnIndex >= 0 ? state.players[state.turnIndex].name : "-";

  els.communityCards.innerHTML = state.community.map((c) => cardHtml(c)).join("");

  els.playersArea.innerHTML = state.players.map((p, idx) => {
    const hideCards = !p.isHuman && !state.revealAllCards && p.inHand && !p.folded;
    const cardsHtml = p.inHand ? p.hand.map((c) => cardHtml(c, hideCards)).join("") : "<em>本局未参与</em>";
    const stateText = p.folded ? "已弃牌" : p.allIn ? "All-in" : p.inHand ? "进行中" : "未参与";
    const classes = ["player", p.isHuman ? "you" : "", idx === state.turnIndex ? "current" : "", p.folded ? "folded" : ""]
      .filter(Boolean)
      .join(" ");
    return `
      <article class="${classes}">
        <h3>${p.name}</h3>
        <p>筹码：${p.chips}</p>
        <p>本轮下注：${p.bet}</p>
        <p>状态：${stateText}</p>
        <div class="cards">${cardsHtml}</div>
      </article>
    `;
  }).join("");

  const yourTurn = state.handActive && state.turnIndex >= 0 && state.players[state.turnIndex].isHuman;
  els.checkCallBtn.disabled = !yourTurn;
  els.foldBtn.disabled = !yourTurn;
  els.betRaiseBtn.disabled = !yourTurn || !canHumanRaise();
}

function canHumanRaise() {
  const you = state.players.find((p) => p.isHuman);
  if (!you || you.folded || you.allIn) return false;
  const target = state.currentBet === 0 ? BET_SIZE : state.currentBet + BET_SIZE;
  const need = target - you.bet;
  return you.chips >= need && need > 0;
}

function postBlind(index, amount) {
  const p = state.players[index];
  if (!p || !p.inHand || p.chips <= 0) return;
  const blind = Math.min(amount, p.chips);
  p.chips -= blind;
  p.bet += blind;
  if (p.chips === 0) p.allIn = true;
  state.pot += blind;
  state.currentBet = Math.max(state.currentBet, p.bet);
}

function activeInHandPlayers() {
  return state.players.filter((p) => p.inHand && !p.folded);
}

function aliveToActPlayers() {
  return state.players.filter((p) => p.inHand && !p.folded && !p.allIn);
}

function resetRoundActions() {
  for (const p of state.players) {
    if (p.inHand && !p.folded && !p.allIn) p.acted = false;
  }
}

function startHand() {
  initPlayers();
  const entering = state.players.filter((p) => p.chips > 0);
  if (entering.length < 2) {
    els.message.textContent = "至少需要 2 名有筹码玩家参与。";
    render();
    return;
  }

  state.deck = createDeck();
  state.community = [];
  state.pot = 0;
  state.street = 0;
  state.currentBet = 0;
  state.handActive = true;
  state.revealAllCards = false;

  for (const p of state.players) {
    p.hand = [];
    p.bet = 0;
    p.folded = false;
    p.allIn = false;
    p.acted = false;
    p.inHand = p.chips > 0;
  }

  for (let r = 0; r < 2; r++) {
    for (const p of state.players) {
      if (p.inHand) p.hand.push(drawCard());
    }
  }

  const firstIn = nextEligibleIndex(state.dealerIndex, (p) => p.inHand);
  const sb = nextEligibleIndex(firstIn, (p) => p.inHand);
  const bb = nextEligibleIndex(sb, (p) => p.inHand);

  postBlind(sb, SMALL_BLIND);
  postBlind(bb, BIG_BLIND);

  resetRoundActions();
  if (state.players[bb].inHand && !state.players[bb].allIn) state.players[bb].acted = true;

  state.turnIndex = nextEligibleIndex(bb, (p) => p.inHand && !p.folded && !p.allIn);
  els.message.textContent = "新一局开始。";
  render();
  scheduleAiIfNeeded();
}

function nextEligibleIndex(fromIndex, predicate) {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (predicate(state.players[idx], idx)) return idx;
  }
  return -1;
}

function markOthersNeedAction(raiserIdx) {
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (!p.inHand || p.folded || p.allIn) continue;
    p.acted = i === raiserIdx;
  }
}

function doBet(p, amount) {
  const real = Math.min(amount, p.chips);
  p.chips -= real;
  p.bet += real;
  state.pot += real;
  state.currentBet = Math.max(state.currentBet, p.bet);
  if (p.chips === 0) p.allIn = true;
}

function humanCheckCall() {
  if (!isHumanTurn()) return;
  const you = state.players[state.turnIndex];
  const toCall = state.currentBet - you.bet;
  if (toCall > 0) {
    const paid = Math.min(toCall, you.chips);
    doBet(you, toCall);
    els.message.textContent = `你跟注 ${paid}。`;
  } else {
    els.message.textContent = "你过牌。";
  }
  you.acted = true;
  advanceAfterAction();
}

function humanBetRaise() {
  if (!isHumanTurn()) return;
  const you = state.players[state.turnIndex];
  const target = state.currentBet === 0 ? BET_SIZE : state.currentBet + BET_SIZE;
  const need = target - you.bet;
  if (need <= 0 || you.chips < need) return;
  doBet(you, need);
  markOthersNeedAction(state.turnIndex);
  els.message.textContent = state.currentBet === BET_SIZE ? `你下注到 ${you.bet}。` : `你加注到 ${you.bet}。`;
  advanceAfterAction();
}

function humanFold() {
  if (!isHumanTurn()) return;
  const you = state.players[state.turnIndex];
  you.folded = true;
  you.acted = true;
  els.message.textContent = "你弃牌。";
  advanceAfterAction();
}

function isHumanTurn() {
  return state.handActive && state.turnIndex >= 0 && state.players[state.turnIndex].isHuman;
}

function scheduleAiIfNeeded() {
  if (!state.handActive || state.turnIndex < 0) return;
  const cur = state.players[state.turnIndex];
  if (!cur.isHuman) {
    setTimeout(aiAction, 450);
  }
}

function aiAction() {
  if (!state.handActive || state.turnIndex < 0) return;
  const ai = state.players[state.turnIndex];
  if (ai.isHuman || ai.folded || ai.allIn) return;

  const toCall = state.currentBet - ai.bet;
  const strength = estimateStrength(ai.hand, state.community);
  let action = "check";

  if (toCall > 0) {
    if (strength < 0.22 && Math.random() < 0.55) {
      action = "fold";
    } else if (strength > 0.82 && ai.chips >= toCall + BET_SIZE && Math.random() < 0.35) {
      action = "raise";
    } else {
      action = "call";
    }
  } else if (strength > 0.8 && ai.chips >= BET_SIZE && Math.random() < 0.45) {
    action = "bet";
  }

  if (action === "fold") {
    ai.folded = true;
    ai.acted = true;
    els.message.textContent = `${ai.name} 弃牌。`;
  } else if (action === "call") {
    doBet(ai, toCall);
    ai.acted = true;
    els.message.textContent = `${ai.name} 跟注 ${toCall}。`;
  } else if (action === "raise") {
    const target = state.currentBet + BET_SIZE;
    const need = target - ai.bet;
    doBet(ai, need);
    markOthersNeedAction(state.turnIndex);
    els.message.textContent = `${ai.name} 加注到 ${ai.bet}。`;
  } else if (action === "bet") {
    doBet(ai, BET_SIZE);
    markOthersNeedAction(state.turnIndex);
    els.message.textContent = `${ai.name} 下注 ${BET_SIZE}。`;
  } else {
    ai.acted = true;
    els.message.textContent = `${ai.name} 过牌。`;
  }

  advanceAfterAction();
}

function advanceAfterAction() {
  if (!state.handActive) return;

  const survivors = activeInHandPlayers();
  if (survivors.length === 1) {
    const winner = survivors[0];
    winner.chips += state.pot;
    els.message.textContent = `${winner.name} 赢得底池 ${state.pot}。`;
    state.pot = 0;
    state.handActive = false;
    state.revealAllCards = true;
    state.turnIndex = -1;
    state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
    render();
    return;
  }

  if (isBettingRoundComplete()) {
    goNextStreetOrShowdown();
    return;
  }

  state.turnIndex = nextEligibleIndex(state.turnIndex, (p) => p.inHand && !p.folded && !p.allIn);
  render();
  scheduleAiIfNeeded();
}

function isBettingRoundComplete() {
  const actives = aliveToActPlayers();
  if (actives.length === 0) return true;
  return actives.every((p) => p.acted && p.bet === state.currentBet);
}

function goNextStreetOrShowdown() {
  if (state.street === 0) {
    state.community.push(drawCard(), drawCard(), drawCard());
    state.street = 1;
  } else if (state.street === 1) {
    state.community.push(drawCard());
    state.street = 2;
  } else if (state.street === 2) {
    state.community.push(drawCard());
    state.street = 3;
  } else {
    showdown();
    return;
  }

  for (const p of state.players) p.bet = 0;
  state.currentBet = 0;
  resetRoundActions();

  const start = nextEligibleIndex(state.dealerIndex, (p) => p.inHand && !p.folded && !p.allIn);
  state.turnIndex = start;
  els.message.textContent = `${STREET_NAMES[state.street]}阶段开始。`;
  render();
  scheduleAiIfNeeded();
}

function showdown() {
  const contenders = state.players.filter((p) => p.inHand && !p.folded);
  const scored = contenders.map((p) => ({ p, rank: bestHand([...p.hand, ...state.community]) }));

  let best = scored[0];
  for (const s of scored.slice(1)) {
    if (compareRank(s.rank, best.rank) > 0) best = s;
  }
  const winners = scored.filter((s) => compareRank(s.rank, best.rank) === 0).map((s) => s.p);

  const share = Math.floor(state.pot / winners.length);
  let remainder = state.pot - share * winners.length;
  for (const w of winners) {
    w.chips += share + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  }

  state.street = 4;
  state.handActive = false;
  state.revealAllCards = true;
  state.turnIndex = -1;

  const winNames = winners.map((w) => w.name).join("、");
  els.message.textContent = `${winNames} 获胜（${best.rank.name}），赢得底池。`;
  state.pot = 0;
  state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
  render();
}

function estimateStrength(hand, community) {
  const all = [...hand, ...community];
  if (all.length <= 2) {
    const [a, b] = hand;
    let s = (a.value + b.value) / 30;
    if (a.value === b.value) s += 0.25;
    if (a.suit === b.suit) s += 0.08;
    if (Math.abs(a.value - b.value) <= 2) s += 0.05;
    return Math.min(0.99, s);
  }
  const rank = bestHand(all);
  return rank.score / 100;
}

function bestHand(cards) {
  const combos = choose(cards, 5);
  let best = null;
  for (const combo of combos) {
    const ranked = rankFive(combo);
    if (!best || compareRank(ranked, best) > 0) best = ranked;
  }
  return best;
}

function choose(arr, k) {
  const out = [];
  function rec(start, path) {
    if (path.length === k) return out.push([...path]);
    for (let i = start; i < arr.length; i++) {
      path.push(arr[i]);
      rec(i + 1, path);
      path.pop();
    }
  }
  rec(0, []);
  return out;
}

function rankFive(cards) {
  const values = cards.map((c) => c.value).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const count = new Map();
  for (const v of values) count.set(v, (count.get(v) || 0) + 1);
  const groups = [...count.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  const flush = suits.every((s) => s === suits[0]);
  const straightHigh = getStraightHigh(values);

  if (flush && straightHigh) return mk(8, [straightHigh], "同花顺");
  if (groups[0][1] === 4) return mk(7, [groups[0][0], groups[1][0]], "四条");
  if (groups[0][1] === 3 && groups[1][1] === 2) return mk(6, [groups[0][0], groups[1][0]], "葫芦");
  if (flush) return mk(5, values, "同花");
  if (straightHigh) return mk(4, [straightHigh], "顺子");
  if (groups[0][1] === 3) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]).sort((a, b) => b - a);
    return mk(3, [groups[0][0], ...kickers], "三条");
  }
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const pairVals = groups.filter((g) => g[1] === 2).map((g) => g[0]).sort((a, b) => b - a);
    const kicker = groups.find((g) => g[1] === 1)[0];
    return mk(2, [...pairVals, kicker], "两对");
  }
  if (groups[0][1] === 2) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]).sort((a, b) => b - a);
    return mk(1, [groups[0][0], ...kickers], "一对");
  }
  return mk(0, values, "高牌");
}

function mk(type, tiebreak, name) {
  const score = type * 10 + (tiebreak[0] || 0) / 14;
  return { type, tiebreak, name, score };
}

function compareRank(a, b) {
  if (a.type !== b.type) return a.type - b.type;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i++) {
    const av = a.tiebreak[i] || 0;
    const bv = b.tiebreak[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function getStraightHigh(valuesDesc) {
  const uniq = [...new Set(valuesDesc)].sort((a, b) => b - a);
  if (uniq.includes(14)) uniq.push(1);
  let run = 1;
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i - 1] - 1 === uniq[i]) {
      run += 1;
      if (run >= 5) return uniq[i - 4];
    } else {
      run = 1;
    }
  }
  return 0;
}

els.aiCount.addEventListener("change", () => {
  if (!state.handActive) {
    initPlayers();
    render();
  }
});
els.newHandBtn.addEventListener("click", startHand);
els.checkCallBtn.addEventListener("click", humanCheckCall);
els.betRaiseBtn.addEventListener("click", humanBetRaise);
els.foldBtn.addEventListener("click", humanFold);

initPlayers();
render();
