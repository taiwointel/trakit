import { namesLikelySamePerson } from "@/lib/selfTransfer";

// Different banks (or even different transactions on the same bank) print
// the same person's name in different forms — "KEHINDE OLAYINKA OGUNFILE"
// on one statement, just "KEHINDE OGUNFILE" on another. Left as exact
// string groups, those show up as two separate, smaller-looking entries
// instead of one real relationship. Cluster exact-string groups whose names
// are a same-person match (order-independent, one contained in the other)
// via union-find, then merge each cluster's totals (and underlying
// transactions, for drill-through) under whichever variant has the most
// name words (the fullest form seen). Shared by Major Beneficiaries and
// Spend Concentration's per-category beneficiary breakdown.
function clusterGroups(groups) {
  const n = groups.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function union(a, b) { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (namesLikelySamePerson(groups[i].name, groups[j].name)) union(i, j);
    }
  }

  const clusters = {};
  for (let i = 0; i < n; i++) {
    const root = find(i);
    (clusters[root] ||= []).push(groups[i]);
  }

  return Object.values(clusters).map((members) => {
    const total = members.reduce((s, m) => s + m.total, 0);
    const count = members.reduce((s, m) => s + m.count, 0);
    const txns  = members.flatMap((m) => m.entries).sort((a, b) => b.date.localeCompare(a.date));
    const canonical = [...members].sort((a, b) => {
      const wordsA = a.name.trim().split(/\s+/).length;
      const wordsB = b.name.trim().split(/\s+/).length;
      return wordsB !== wordsA ? wordsB - wordsA : b.total - a.total;
    })[0].name;
    return { name: canonical, total, count, entries: txns };
  });
}

/** Groups `entries` by their `beneficiary` field, clustering name variants of the same person, sorted by total descending. */
export function clusterByBeneficiary(entries) {
  const map = {};
  for (const e of entries) {
    const key = (e.beneficiary || "").trim();
    if (!key) continue;
    if (!map[key]) map[key] = { name: key, total: 0, count: 0, entries: [] };
    map[key].total += Number(e.amount);
    map[key].count += 1;
    map[key].entries.push(e);
  }
  return clusterGroups(Object.values(map)).sort((a, b) => b.total - a.total);
}
