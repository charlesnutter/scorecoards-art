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

function buildSide(boxTeam) {
  const slots = new Map(); // slot number -> [{id,name,number,pos,order}]
  for (const p of Object.values(boxTeam.players || {})) {
    const order = parseInt(p.battingOrder, 10);
    if (isNaN(order)) continue;
    const slot = Math.floor(order / 100);
    if (!slots.has(slot)) slots.set(slot, []);
    slots.get(slot).push({
      id: p.person.id,
      name: p.person.fullName,
      number: p.jerseyNumber || "",
      pos: p.position?.abbreviation || "",
      order,
    });
  }
  for (const list of slots.values()) list.sort((a, b) => a.order - b.order);
  return {
    name: boxTeam.team?.name || "",
    slots,
    slotOf: (batterId) => {
      for (const [slot, players] of slots)
        if (players.some((p) => p.id === batterId)) return slot;
      return null;
    },
    cells: new Map(), // slot -> Map(inning -> [pa, ...])
  };
}

export function normalizeGame(feed) {
  const gd = feed.gameData;
  const ld = feed.liveData;
  const box = ld.boxscore.teams;

  const sides = { away: buildSide(box.away), home: buildSide(box.home) };
  const allPlays = ld.plays?.allPlays || [];
  let maxInning = 9;

  for (const play of allPlays) {
    if (play.result?.type !== "atBat" || !play.about?.isComplete) continue;
    const side = play.about.halfInning === "top" ? sides.away : sides.home;
    const slot = side.slotOf(play.matchup.batter.id);
    if (slot == null) continue;
    const inning = play.about.inning;
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
    if (!side.cells.has(slot)) side.cells.set(slot, new Map());
    const byInning = side.cells.get(slot);
    if (!byInning.has(inning)) byInning.set(inning, []);
    byInning.get(inning).push(pa);
  }

  const ls = ld.linescore || {};
  const scoring = (ld.plays?.scoringPlays || [])
    .map((i) => allPlays[i])
    .filter(Boolean)
    .map((p) => ({
      inning: `${p.about.halfInning === "top" ? "T" : "B"}${p.about.inning}`,
      desc: p.result.description || "",
    }));

  return {
    meta: {
      gamePk: gd.game?.pk,
      date: gd.datetime?.officialDate || "",
      venue: gd.venue?.name || "",
      status: gd.status?.detailedState || "",
      away: { name: gd.teams.away.name, abbr: gd.teams.away.abbreviation },
      home: { name: gd.teams.home.name, abbr: gd.teams.home.abbreviation },
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
  };
}
