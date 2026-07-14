// Reduce a GUMBO live feed into the minimal model a scorecard needs:
// lineup slots per side, one entry per plate appearance keyed by
// (slot, inning), plus the linescore and scoring-play notes.

const BASE_NUM = { "1B": 1, "2B": 2, "3B": 3, "4B": 4, score: 4 };

function baseNum(base) {
  return BASE_NUM[base] || 0;
}

// Fielding credits in play order, consecutive duplicates collapsed,
// e.g. a 6-4-3 double play yields ["6", "4", "3"].
function fielders(play, credit) {
  const seq = [];
  for (const r of play.runners || []) {
    for (const c of r.credits || []) {
      if (credit && !c.credit?.includes(credit)) continue;
      const code = c.position?.code;
      if (code && seq[seq.length - 1] !== code) seq.push(code);
    }
  }
  return seq;
}

function trajectory(play) {
  const hit = (play.playEvents || []).filter((e) => e.hitData?.trajectory);
  return hit.length ? hit[hit.length - 1].hitData.trajectory : null;
}

const TRAJ_PREFIX = { fly_ball: "F", line_drive: "L", popup: "P" };

function outCode(play) {
  const seq = fielders(play);
  if (!seq.length) return "OUT";
  if (seq.length === 1) {
    const prefix = TRAJ_PREFIX[trajectory(play)];
    return prefix ? prefix + seq[0] : `${seq[0]}U`;
  }
  return seq.join("-");
}

function playCode(play) {
  const et = play.result.eventType;
  switch (et) {
    case "single":
      return "1B";
    case "double":
      return "2B";
    case "triple":
      return "3B";
    case "home_run":
      return "HR";
    case "walk":
      return "BB";
    case "intent_walk":
      return "IBB";
    case "hit_by_pitch":
      return "HBP";
    case "catcher_interf":
      return "CI";
    case "strikeout":
    case "strikeout_double_play": {
      const pitches = (play.playEvents || []).filter((e) => e.isPitch);
      const last = pitches[pitches.length - 1];
      // Backwards K for a called third strike.
      return last?.details?.code === "C" ? "ꓘ" : "K";
    }
    case "field_error":
      return "E" + (fielders(play, "error")[0] || "");
    case "fielders_choice":
    case "fielders_choice_out":
      return "FC";
    case "force_out":
      return outCode(play);
    case "grounded_into_double_play":
    case "double_play":
      return outCode(play) + " DP";
    case "triple_play":
      return outCode(play) + " TP";
    case "sac_fly":
    case "sac_fly_double_play":
      return "SF" + (fielders(play)[0] || "");
    case "sac_bunt":
    case "sac_bunt_double_play":
      return "SAC";
    case "field_out":
      return outCode(play);
    default:
      // Unmapped events keep the API's short label so nothing renders blank.
      return play.result.event || "?";
  }
}

// How far the batter got on his own plate appearance (0 = never reached,
// 4 = scored), plus whether he was put out along the way.
function batterFate(play) {
  const bid = play.matchup.batter.id;
  let base = 0;
  let out = false;
  let outNumber = null;
  for (const r of play.runners || []) {
    if (r.details?.runner?.id !== bid) continue;
    const m = r.movement || {};
    if (m.isOut) {
      out = true;
      outNumber = m.outNumber;
      base = Math.max(base, baseNum(m.outBase) - 1);
    } else {
      base = Math.max(base, baseNum(m.end));
    }
  }
  return { base, out, outNumber };
}

// Sides are plain JSON (no Maps/functions) so normalized games can be
// saved as fixture files and fed straight back into the renderer.
function buildSide(boxTeam) {
  const slots = {}; // slot number -> [{id,name,number,pos,order}]
  for (const p of Object.values(boxTeam.players || {})) {
    const order = parseInt(p.battingOrder, 10);
    if (isNaN(order)) continue;
    const slot = Math.floor(order / 100);
    (slots[slot] ??= []).push({
      id: p.person.id,
      name: p.person.fullName,
      number: p.jerseyNumber || "",
      pos: p.position?.abbreviation || "",
      order,
    });
  }
  for (const list of Object.values(slots)) list.sort((a, b) => a.order - b.order);
  return {
    name: boxTeam.team?.name || "",
    slots,
    cells: {}, // slot -> { inning -> [pa, ...] }
  };
}

// Box-score footnote lines (2B, HR, SB...) from the boxscore's own
// pre-formatted info sections, with verbose parentheticals condensed:
// "HR: Story (1, 6th inning off Rodón, 0 on, 0 out)." -> "HR: Story (1)"
const NOTE_LABELS = new Set(["2B", "3B", "HR", "SB", "CS", "SF", "SAC", "GIDP", "E", "PB"]);

function battingNotes(boxTeam) {
  const out = [];
  for (const sec of boxTeam.info || []) {
    for (const f of sec.fieldList || []) {
      if (!NOTE_LABELS.has(f.label)) continue;
      const v = String(f.value || "")
        .trim()
        .replace(/\.$/, "")
        .replace(/\(([^,)]+)[^)]*\)/g, "($1)");
      out.push(`${f.label}: ${v}`);
    }
  }
  return out;
}

// Game-level pitching footnotes (wild pitches, IBB, hit batters, balks)
// and the box-score footer facts (time, attendance, weather...).
const GAME_NOTE_LABELS = new Set(["WP", "IBB", "HBP", "Balk"]);
const GAME_INFO_LABELS = ["First pitch", "T", "Att", "Weather", "Wind"];

function gameLevelNotes(box) {
  const clean = (v) => String(v || "").trim().replace(/\.$/, "");
  const notes = [];
  const info = [];
  const detail = {};
  const get = (label) => {
    const f = (box.info || []).find((x) => x.label === label);
    return f ? clean(f.value) : "";
  };
  for (const f of box.info || []) {
    if (GAME_NOTE_LABELS.has(f.label)) notes.push(`${f.label}: ${clean(f.value)}`);
  }
  for (const label of GAME_INFO_LABELS) {
    const v = get(label);
    if (v) info.push(label === "Weather" || label === "Wind" ? v : `${label}: ${v}`);
  }
  // structured facts for panel-style rendering
  detail.firstPitch = get("First pitch");
  detail.duration = get("T");
  detail.attendance = get("Att");
  detail.wind = get("Wind");
  const weather = get("Weather");
  const m = weather.match(/^(\d+)\s*degrees?,?\s*(.*)$/i);
  detail.temp = m ? `${m[1]}°` : "";
  detail.sky = m ? m[2] : weather;
  return [notes, info, detail];
}

// Conventional box-score pitching line, in order of appearance.
function buildPitching(boxTeam, decisions) {
  return (boxTeam.pitchers || [])
    .map((id) => {
      const p = boxTeam.players?.[`ID${id}`];
      if (!p) return null;
      const st = p.stats?.pitching || {};
      let note = "";
      if (decisions.winner?.id === id) note = "W";
      else if (decisions.loser?.id === id) note = "L";
      else if (decisions.save?.id === id) note = "S";
      return {
        name: p.person.fullName,
        note,
        ip: st.inningsPitched ?? "",
        h: st.hits ?? 0,
        r: st.runs ?? 0,
        er: st.earnedRuns ?? 0,
        bb: st.baseOnBalls ?? 0,
        so: st.strikeOuts ?? 0,
        hr: st.homeRuns ?? 0,
        p: st.pitchesThrown ?? st.numberOfPitches ?? "",
        strikes: st.strikes ?? "",
      };
    })
    .filter(Boolean);
}

function slotOf(side, batterId) {
  for (const [slot, players] of Object.entries(side.slots))
    if (players.some((p) => p.id === batterId)) return Number(slot);
  return null;
}

export function normalizeGame(feed) {
  const gd = feed.gameData;
  const ld = feed.liveData;
  const box = ld.boxscore.teams;

  const sides = { away: buildSide(box.away), home: buildSide(box.home) };
  const allPlays = ld.plays?.allPlays || [];
  let maxInning = 9;

  // Runners currently on base in the half-inning being processed,
  // keyed by player id -> their PA entry, so advancement caused by
  // later batters (and runs scored) is back-filled onto the PA where
  // the runner originally reached.
  let activeKey = "";
  let onBase = {};

  for (const play of allPlays) {
    if (play.result?.type !== "atBat" || !play.about?.isComplete) continue;
    const batterId = play.matchup.batter.id;
    const side = play.about.halfInning === "top" ? sides.away : sides.home;
    const inning = play.about.inning;

    const key = `${inning}-${play.about.halfInning}`;
    if (key !== activeKey) {
      activeKey = key;
      onBase = {};
    }
    for (const r of play.runners || []) {
      const rid = r.details?.runner?.id;
      if (rid === batterId) continue;
      const prior = onBase[rid];
      if (!prior) continue; // pinch runner etc.
      const m = r.movement || {};
      if (m.isOut) {
        delete onBase[rid];
        continue;
      }
      const b = baseNum(m.end);
      if (b > prior.base) prior.base = b;
      if (b === 4) {
        prior.scored = true;
        delete onBase[rid];
      }
    }

    const slot = slotOf(side, batterId);
    if (slot == null) continue;
    maxInning = Math.max(maxInning, inning);

    const fate = batterFate(play);
    const pa = {
      inning,
      code: playCode(play),
      base: fate.base,
      out: fate.out,
      outNumber: fate.outNumber,
      rbi: play.result.rbi || 0,
      scored: fate.base === 4,
      desc: play.result.description || "",
    };
    ((side.cells[slot] ??= {})[inning] ??= []).push(pa);
    if (!fate.out && fate.base > 0 && fate.base < 4) onBase[batterId] = pa;
  }

  const ls = ld.linescore || {};
  const [gameNotes, gameInfo, gameInfoDetail] = gameLevelNotes(ld.boxscore);
  const scoring = (ld.plays?.scoringPlays || [])
    .map((i) => allPlays[i])
    .filter(Boolean)
    .map((p) => {
      const full = p.matchup.batter.fullName || "";
      return {
        inning: `${p.about.halfInning === "top" ? "T" : "B"}${p.about.inning}`,
        desc: p.result.description || "",
        // compact one-line form: "Story 1B", 2 RBI, score after the play
        short: `${full.split(" ").slice(1).join(" ") || full} ${playCode(p)}`,
        rbi: p.result.rbi || 0,
        score: `${p.result.awayScore ?? ""}-${p.result.homeScore ?? ""}`,
      };
    });

  return {
    meta: {
      gamePk: gd.game?.pk,
      date: gd.datetime?.officialDate || "",
      venue: gd.venue?.name || "",
      status: gd.status?.detailedState || "",
      away: { name: gd.teams.away.name, abbr: gd.teams.away.abbreviation, city: gd.teams.away.franchiseName },
      home: { name: gd.teams.home.name, abbr: gd.teams.home.abbreviation, city: gd.teams.home.franchiseName },
    },
    maxInning,
    linescore: {
      innings: (ls.innings || []).map((i) => ({
        num: i.num,
        away: i.away?.runs,
        home: i.home?.runs,
      })),
      totals: {
        away: ls.teams?.away || {},
        home: ls.teams?.home || {},
      },
    },
    sides,
    scoring,
    pitching: {
      away: buildPitching(box.away, ld.decisions || {}),
      home: buildPitching(box.home, ld.decisions || {}),
    },
    battingNotes: {
      away: battingNotes(box.away),
      home: battingNotes(box.home),
    },
    gameNotes,
    gameInfo,
    gameInfoDetail,
  };
}
