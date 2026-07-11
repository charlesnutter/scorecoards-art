const BASE = "https://statsapi.mlb.com/api";

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MLB API ${res.status} for ${url}`);
  return res.json();
}

// Era-correct team list for the season containing `date` (YYYY-MM-DD).
export async function fetchTeams(season) {
  const data = await getJSON(`${BASE}/v1/teams?sportId=1&season=${season}`);
  return (data.teams || [])
    .map((t) => ({ id: t.id, name: t.name, abbr: t.abbreviation }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Games for a team on a date; more than one entry means a doubleheader.
export async function fetchSchedule(teamId, date) {
  const data = await getJSON(
    `${BASE}/v1/schedule?sportId=1&teamId=${teamId}&date=${date}`
  );
  const games = data.dates?.[0]?.games || [];
  return games.map((g) => ({
    gamePk: g.gamePk,
    label: `${g.teams.away.team.name} @ ${g.teams.home.team.name}`,
    status: g.status?.detailedState || "",
  }));
}

export function fetchFeed(gamePk) {
  return getJSON(`${BASE}/v1.1/game/${gamePk}/feed/live`);
}

// Editorial recap + headline; shape varies by era, so fail soft.
export async function fetchNotes(gamePk) {
  try {
    const data = await getJSON(`${BASE}/v1/game/${gamePk}/content`);
    const recap = data.editorial?.recap?.mlb || {};
    return { headline: recap.headline || "", blurb: recap.blurb || "" };
  } catch {
    return { headline: "", blurb: "" };
  }
}
