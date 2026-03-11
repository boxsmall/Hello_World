const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const STREET_NAMES = ["翻牌前", "翻牌", "转牌", "河牌", "摊牌"];

const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const BET_SIZE = 20;

const state = {
  deck: [],
  community: [],
  players: [
    { id: "you", name: "你", chips: 1000, hand: [], bet: 0, folded: false },
    { id: "ai", name: "电脑", chips: 1000, hand: [], bet: 0, folded: false },
  ],
  pot: 0,
  street: -1,
  currentBet: 0,
  handActive: false,
  acted: { you: false, ai: false },
};

const els = {
  street: document.getElementById("street"),
  pot: document.getElementById("pot"),
  toCall: document.getElementById("toCall"),
  message: document.getElementById("message"),
  communityCards: document.getElementById("communityCards"),
  aiCards: document.getElementById("aiCards"),
  youCards: document.getElementById("youCards"),
  aiChips: document.getElementById("aiChips"),
  youChips: document.getElementById("youChips"),
  aiBet: document.getElementById("aiBet"),
  youBet: document.getElementById("youBet"),
  newHandBtn: document.getElementById("newHandBtn"),
  checkCallBtn: document.getElementById("checkCallBtn"),
  betRaiseBtn: document.getElementById("betRaiseBtn"),
  foldBtn: document.getElementById("foldBtn"),
};

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, value: RANKS.indexOf(rank) + 2 });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawCard() {
  return state.deck.pop();
}

function cardHtml(card, hidden = false) {
  if (hidden) return '<div class="card back"></div>';
  const red = card.suit === "♥" || card.suit === "♦" ? "red" : "";
  return `<div class="card ${red}">${card.rank}${card.suit}</div>`;
}

function render(showAiCards = false) {
  els.street.textContent = state.street >= 0 ? STREET_NAMES[state.street] : "-";
  els.pot.textContent = state.pot;
  els.toCall.textContent = Math.max(0, state.currentBet - player("you").bet);
  els.aiChips.textContent = player("ai").chips;
  els.youChips.textContent = player("you").chips;
  els.aiBet.textContent = player("ai").bet;
  els.youBet.textContent = player("you").bet;

  els.communityCards.innerHTML = state.community.map((c) => cardHtml(c)).join("");
  els.youCards.innerHTML = player("you").hand.map((c) => cardHtml(c)).join("");
  els.aiCards.innerHTML = player("ai").hand.map((c) => cardHtml(c, !showAiCards)).join("");

  const enable = state.handActive;
  els.checkCallBtn.disabled = !enable;
  els.betRaiseBtn.disabled = !enable || player("you").chips < BET_SIZE;
  els.foldBtn.disabled = !enable;
}

function player(id) {
  return state.players.find((p) => p.id === id);
}

function postBlind(p, amount) {
  const blind = Math.min(amount, p.chips);
  p.chips -= blind;
  p.bet += blind;
  state.pot += blind;
  state.currentBet = Math.max(state.currentBet, p.bet);
}

function startHand() {
  if (state.players.some((p) => p.chips <= 0)) {
    els.message.textContent = "有玩家筹码归零，刷新页面可重新开始。";
    return;
  }
  state.deck = createDeck();
  state.community = [];
  state.pot = 0;
  state.street = 0;
  state.currentBet = 0;
  state.handActive = true;
  state.acted = { you: false, ai: false };

  for (const p of state.players) {
    p.hand = [drawCard(), drawCard()];
    p.bet = 0;
    p.folded = false;
  }

  postBlind(player("you"), SMALL_BLIND);
  postBlind(player("ai"), BIG_BLIND);

  els.message.textContent = "新一局开始，你先行动。";
  render(false);
}

function nextStreet() {
  for (const p of state.players) p.bet = 0;
  state.currentBet = 0;
  state.acted = { you: false, ai: false };

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

  els.message.textContent = `${STREET_NAMES[state.street]}阶段，你先行动。`;
  render(false);
}

function bet(p, amount) {
  const real = Math.min(amount, p.chips);
  p.chips -= real;
  p.bet += real;
  state.pot += real;
  state.currentBet = Math.max(state.currentBet, p.bet);
}

function youCheckCall() {
  if (!state.handActive) return;
  const you = player("you");
  const toCall = state.currentBet - you.bet;
  if (toCall > 0) {
    bet(you, toCall);
    els.message.textContent = `你选择跟注 ${toCall}。`;
  } else {
    els.message.textContent = "你选择过牌。";
  }
  state.acted.you = true;
  render(false);
  aiTurn();
}

function youBetRaise() {
  if (!state.handActive) return;
  const you = player("you");
  const target = state.currentBet === 0 ? BET_SIZE : state.currentBet + BET_SIZE;
  const need = target - you.bet;
  if (need <= 0 || you.chips <= 0) return;

  bet(you, need);
  state.acted.you = true;
  state.acted.ai = false;
  els.message.textContent = `你${state.currentBet === BET_SIZE ? "下注" : "加注"}到 ${you.bet}。`;
  render(false);
  aiTurn();
}

function youFold() {
  if (!state.handActive) return;
  const ai = player("ai");
  ai.chips += state.pot;
  state.handActive = false;
  els.message.textContent = `你弃牌，电脑赢得底池 ${state.pot}。`;
  state.pot = 0;
  render(true);
}

function aiTurn() {
  if (!state.handActive) return;

  const you = player("you");
  const ai = player("ai");
  const toCall = state.currentBet - ai.bet;

  let action = "check";
  const strength = estimatePreflopStrength(ai.hand, state.community);

  if (toCall > 0) {
    if (toCall > ai.chips) {
      action = "call";
    } else if (strength < 0.28 && Math.random() < 0.6) {
      action = "fold";
    } else if (strength > 0.78 && ai.chips > toCall + BET_SIZE && Math.random() < 0.4) {
      action = "raise";
    } else {
      action = "call";
    }
  } else if (strength > 0.8 && ai.chips >= BET_SIZE && Math.random() < 0.55) {
    action = "bet";
  }

  if (action === "fold") {
    you.chips += state.pot;
    state.handActive = false;
    els.message.textContent = `电脑弃牌，你赢得底池 ${state.pot}。`;
    state.pot = 0;
    render(true);
    return;
  }

  if (action === "call") {
    bet(ai, toCall);
    els.message.textContent = `电脑跟注 ${toCall}。`;
  } else if (action === "raise") {
    const target = state.currentBet + BET_SIZE;
    const need = target - ai.bet;
    bet(ai, need);
    els.message.textContent = `电脑加注到 ${ai.bet}。`;
    state.acted.ai = true;
    state.acted.you = false;
    render(false);
    return;
  } else if (action === "bet") {
    bet(ai, BET_SIZE);
    els.message.textContent = `电脑下注 ${BET_SIZE}。`;
    state.acted.ai = true;
    state.acted.you = false;
    render(false);
    return;
  } else {
    els.message.textContent = "电脑过牌。";
  }

  state.acted.ai = true;

  if (state.acted.you && state.acted.ai && player("you").bet === player("ai").bet) {
    if (state.street >= 3) {
      showdown();
    } else {
      nextStreet();
    }
    return;
  }

  render(false);
}

function showdown() {
  const you = player("you");
  const ai = player("ai");
  const youRank = bestHand([...you.hand, ...state.community]);
  const aiRank = bestHand([...ai.hand, ...state.community]);

  const cmp = compareRank(youRank, aiRank);
  if (cmp > 0) {
    you.chips += state.pot;
    els.message.textContent = `你获胜（${youRank.name}），赢得底池 ${state.pot}。`;
  } else if (cmp < 0) {
    ai.chips += state.pot;
    els.message.textContent = `电脑获胜（${aiRank.name}），赢得底池 ${state.pot}。`;
  } else {
    const split = Math.floor(state.pot / 2);
    you.chips += split;
    ai.chips += state.pot - split;
    els.message.textContent = `平局（${youRank.name}），底池平分。`;
  }

  state.pot = 0;
  state.street = 4;
  state.handActive = false;
  render(true);
}

function estimatePreflopStrength(hand, community) {
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
    if (path.length === k) {
      out.push([...path]);
      return;
    }
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

els.newHandBtn.addEventListener("click", startHand);
els.checkCallBtn.addEventListener("click", youCheckCall);
els.betRaiseBtn.addEventListener("click", youBetRaise);
els.foldBtn.addEventListener("click", youFold);

render(false);
