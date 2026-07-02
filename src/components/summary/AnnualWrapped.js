"use client";

import { useState, useMemo } from "react";
import { formatNaira } from "@/lib/format";

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW_LABELS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const CAT_COLORS  = ["#A9854F","#5B8FA8","#7C8C5B","#A8645B","#8A6FA8","#A89A5B","#5BA88A","#A85B86","#6C7686","#8C4F5B","#B07A4E"];

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
}
function fmtMonthFull(m) {
  if (!m) return "—";
  return new Date(m + "-01T00:00:00").toLocaleDateString("en-GB", { month:"long", year:"numeric" });
}
function fmtMonthShort(m) {
  if (!m) return "—";
  return new Date(m + "-01T00:00:00").toLocaleDateString("en-GB", { month:"short" });
}

/* ─── Primitive building blocks ─────────────────────────────────────── */

function Chapter({ children, bg, accent }) {
  return (
    <div style={{
      background: bg,
      borderTop: `3px solid ${accent}`,
      border: `1px solid ${accent}22`,
      borderRadius: 20,
      padding: "26px 22px",
      position: "relative",
      overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

function ChapterLabel({ icon, text, color }) {
  return (
    <p style={{ color, fontFamily:"var(--font-sans)", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.17em", marginBottom:18, display:"flex", alignItems:"center", gap:7 }}>
      <span style={{ fontSize:14 }}>{icon}</span>{text}
    </p>
  );
}

function HeroNum({ value, sub, color = "#ECE9E1" }) {
  return (
    <div style={{ marginBottom:6 }}>
      <p style={{ color, fontFamily:"var(--font-serif)", fontSize:"2.5rem", fontWeight:700, lineHeight:1, marginBottom:4 }}>{value}</p>
      {sub && <p style={{ color:"rgba(167,172,182,0.6)", fontFamily:"var(--font-sans)", fontSize:12 }}>{sub}</p>}
    </div>
  );
}

function StatGrid({ children }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(110px,1fr))", gap:14, marginTop:18 }}>
      {children}
    </div>
  );
}

function StatCell({ label, value, color = "#ECE9E1" }) {
  return (
    <div>
      <p style={{ color:"rgba(167,172,182,0.55)", fontFamily:"var(--font-sans)", fontSize:9.5, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3 }}>{label}</p>
      <p style={{ color, fontFamily:"var(--font-mono)", fontSize:13, fontWeight:600 }}>{value}</p>
    </div>
  );
}

function Story({ children }) {
  return (
    <p style={{ color:"rgba(167,172,182,0.72)", fontFamily:"var(--font-sans)", fontSize:12.5, lineHeight:1.72, fontStyle:"italic", marginTop:18, paddingLeft:12, borderLeft:"2px solid rgba(255,255,255,0.07)" }}>
      {children}
    </p>
  );
}

/* ─── SVG monthly bar chart ─────────────────────────────────────────── */

function MonthChart({ monthlyOut, yearStr, accent }) {
  const vals = MONTH_ABBR.map((_, i) => {
    const k = `${yearStr}-${String(i+1).padStart(2,"0")}`;
    return monthlyOut[k] || 0;
  });
  const maxVal = Math.max(...vals, 1);
  const W = 540, H = 108;
  const slotW = W / 12;
  const bw    = slotW * 0.55;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H+28}`} style={{ overflow:"visible", display:"block", marginTop:4 }}>
      <defs>
        <linearGradient id="mc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={accent} stopOpacity="1" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="mc-peak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ECE9E1" stopOpacity="0.95" />
          <stop offset="100%" stopColor={accent}  stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {[0.33, 0.66, 1].map(p => (
        <line key={p} x1={0} y1={H - H*p} x2={W} y2={H - H*p}
          stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      ))}
      {vals.map((val, i) => {
        const bh     = (val / maxVal) * H;
        const x      = i * slotW + (slotW - bw) / 2;
        const y      = H - bh;
        const isPeak = val > 0 && val === maxVal;
        return (
          <g key={i}>
            {val > 0
              ? <rect x={x} y={y} width={bw} height={bh} rx={3} fill={isPeak ? "url(#mc-peak)" : "url(#mc-grad)"} />
              : <rect x={x} y={H - 2} width={bw} height={2} rx={1} fill="rgba(255,255,255,0.05)" />
            }
            <text x={x + bw/2} y={H+17} textAnchor="middle" fontSize={8.5}
              fill={isPeak ? "rgba(236,233,225,0.85)" : "rgba(167,172,182,0.4)"}
              fontFamily="IBM Plex Mono,monospace">
              {MONTH_ABBR[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Day-of-week bars ──────────────────────────────────────────────── */

function DowChart({ spendByDow, accent }) {
  const max     = Math.max(...spendByDow, 1);
  const peakIdx = spendByDow.indexOf(Math.max(...spendByDow));
  return (
    <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:68, marginTop:10 }}>
      {DOW_LABELS.map((label, i) => {
        const v  = spendByDow[i];
        const h  = Math.max((v / max) * 52, v > 0 ? 4 : 2);
        const ip = i === peakIdx && v > 0;
        return (
          <div key={label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
            <div style={{
              width:"100%", height:h, borderRadius:3,
              background: ip ? accent : v > 0 ? `${accent}50` : "rgba(255,255,255,0.05)",
            }} />
            <span style={{ color: ip ? "#ECE9E1" : "rgba(167,172,182,0.45)", fontFamily:"var(--font-mono)", fontSize:8.5 }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Category horizontal bars ──────────────────────────────────────── */

function CatBars({ allCats, totalOut }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:11, marginTop:6 }}>
      {allCats.slice(0,9).map(([cat, amt], idx) => {
        const pct   = totalOut > 0 ? (amt / totalOut) * 100 : 0;
        const color = CAT_COLORS[idx % CAT_COLORS.length];
        return (
          <div key={cat}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:color, flexShrink:0 }} />
                <span style={{ color: idx < 3 ? "#ECE9E1" : "rgba(236,233,225,0.65)", fontFamily:"var(--font-sans)", fontSize:12.5, fontWeight: idx < 3 ? 600 : 400 }}>
                  {cat}
                </span>
              </div>
              <div style={{ display:"flex", gap:10, flexShrink:0 }}>
                <span style={{ color, fontFamily:"var(--font-mono)", fontSize:10.5, fontWeight:700 }}>{pct.toFixed(1)}%</span>
                <span style={{ color:"rgba(167,172,182,0.55)", fontFamily:"var(--font-mono)", fontSize:10.5 }}>{formatNaira(amt)}</span>
              </div>
            </div>
            <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:2 }}>
              <div style={{ height:4, width:`${Math.min(pct,100)}%`, background:`linear-gradient(to right,${color}55,${color})`, borderRadius:2 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Essential vs Discretionary split bar ──────────────────────────── */

function SplitBar({ essPct, discPct }) {
  return (
    <div style={{ marginTop:18 }}>
      <div style={{ height:22, borderRadius:11, overflow:"hidden", display:"flex" }}>
        {essPct > 0 && (
          <div style={{ width:`${essPct}%`, background:"linear-gradient(to right,#1d5c3e,#5BA88A)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {essPct > 8 && <span style={{ color:"#fff", fontFamily:"var(--font-mono)", fontSize:9, fontWeight:700 }}>{essPct.toFixed(0)}%</span>}
          </div>
        )}
        {discPct > 0 && (
          <div style={{ flex:1, background:"linear-gradient(to right,#7a2035,#C8862E)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {discPct > 8 && <span style={{ color:"#fff", fontFamily:"var(--font-mono)", fontSize:9, fontWeight:700 }}>{discPct.toFixed(0)}%</span>}
          </div>
        )}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:2, background:"#5BA88A" }} />
          <span style={{ color:"rgba(167,172,182,0.65)", fontFamily:"var(--font-sans)", fontSize:11 }}>Essential</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:2, background:"#C8862E" }} />
          <span style={{ color:"rgba(167,172,182,0.65)", fontFamily:"var(--font-sans)", fontSize:11 }}>Discretionary</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Savings rate gauge ─────────────────────────────────────────────── */

function SavingsGauge({ rate, verdict, color }) {
  const pct = Math.max(0, Math.min((rate||0) / 50, 1)) * 100; // 50%+ = full bar
  return (
    <div>
      <div style={{ textAlign:"center", marginBottom:18 }}>
        <p style={{ color, fontFamily:"var(--font-serif)", fontSize:"3.2rem", fontWeight:700, lineHeight:1 }}>{(rate||0).toFixed(1)}%</p>
        <p style={{ color:"rgba(167,172,182,0.55)", fontFamily:"var(--font-sans)", fontSize:11, marginTop:6 }}>avg savings rate vs salary</p>
      </div>
      <div style={{ position:"relative", height:10, background:"rgba(255,255,255,0.07)", borderRadius:6, marginBottom:32 }}>
        <div style={{ position:"absolute", left:"40%", top:"-6px", height:22, width:1, background:`${color}55` }} />
        <span style={{ position:"absolute", left:"40%", top:18, transform:"translateX(-50%)", color:`${color}80`, fontFamily:"var(--font-mono)", fontSize:8 }}>20%</span>
        <div style={{ height:10, width:`${pct}%`, maxWidth:"100%", background:`linear-gradient(to right,${color}50,${color})`, borderRadius:6 }} />
      </div>
      <div style={{ textAlign:"center" }}>
        <span style={{ display:"inline-block", color, fontFamily:"var(--font-sans)", fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", padding:"7px 20px", borderRadius:20, background:`${color}1c`, border:`1px solid ${color}40` }}>
          {verdict}
        </span>
      </div>
    </div>
  );
}

/* ─── Top-3 podium cards ─────────────────────────────────────────────── */

function TopThree({ allCats, totalOut }) {
  if (!allCats.length) return null;
  return (
    <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
      {allCats.slice(0,3).map(([cat,amt],i) => {
        const color = CAT_COLORS[i];
        const pct   = totalOut > 0 ? ((amt/totalOut)*100).toFixed(1) : "0.0";
        const medal = ["🥇","🥈","🥉"][i];
        return (
          <div key={cat} style={{ flex:"1 1 130px", background:`${color}14`, border:`1px solid ${color}35`, borderRadius:12, padding:"12px 13px" }}>
            <p style={{ color, fontFamily:"var(--font-sans)", fontSize:11, fontWeight:700, marginBottom:5 }}>{medal} #{i+1}</p>
            <p style={{ color:"#ECE9E1", fontFamily:"var(--font-serif)", fontSize:"1rem", fontWeight:700, marginBottom:3, lineHeight:1.25 }}>{cat}</p>
            <p style={{ color:"rgba(167,172,182,0.65)", fontFamily:"var(--font-mono)", fontSize:10.5 }}>{formatNaira(amt)}</p>
            <p style={{ color, fontFamily:"var(--font-mono)", fontSize:10, marginTop:2 }}>{pct}% of total</p>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════ */

export default function AnnualWrapped({ entries, salary }) {
  const [open, setOpen] = useState(false);
  const year    = new Date().getFullYear();
  const yearStr = String(year);

  const s = useMemo(() => {
    const ye  = (entries || []).filter((e) => e.date?.startsWith(yearStr));
    const outE = ye.filter((e) => e.flow === "out");
    const inE  = ye.filter((e) => e.flow === "in");

    const totalOut = outE.reduce((a,e) => a + Number(e.amount), 0);
    const totalIn  = inE.reduce((a,e) => a + Number(e.amount), 0);

    const mOut = {}, mIn = {};
    outE.forEach((e) => { const m = e.date.slice(0,7); mOut[m] = (mOut[m]||0) + Number(e.amount); });
    inE.forEach((e)  => { const m = e.date.slice(0,7); mIn[m]  = (mIn[m]||0)  + Number(e.amount); });

    let bestM=null, bestAmt=Infinity, worstM=null, worstAmt=0;
    Object.entries(mOut).forEach(([m,a]) => {
      if (a < bestAmt)  { bestAmt=a;  bestM=m; }
      if (a > worstAmt) { worstAmt=a; worstM=m; }
    });

    let bigJump=0, bigJumpM=null;
    const mKeys = Object.keys(mOut).sort();
    for (let i=1; i<mKeys.length; i++) {
      const j = mOut[mKeys[i]] - mOut[mKeys[i-1]];
      if (j > bigJump) { bigJump=j; bigJumpM=mKeys[i]; }
    }

    const catTotals = {};
    outE.forEach((e) => { const c=e.category||"Uncategorized"; catTotals[c]=(catTotals[c]||0)+Number(e.amount); });
    const allCats = Object.entries(catTotals).sort(([,a],[,b]) => b-a);

    const payCounts = {};
    outE.forEach((e) => { if (e.beneficiary) payCounts[e.beneficiary]=(payCounts[e.beneficiary]||0)+1; });
    const topPayee      = Object.entries(payCounts).sort(([,a],[,b]) => b-a)[0];
    const uniquePayees  = Object.keys(payCounts).length;

    let bigTx=null;
    outE.forEach((e) => { if (!bigTx || Number(e.amount)>Number(bigTx.amount)) bigTx=e; });

    const spendByDow = Array(7).fill(0);
    outE.forEach((e) => { const d=new Date(e.date+"T00:00:00").getDay(); spendByDow[d]+=Number(e.amount); });
    const peakDowIdx = spendByDow.indexOf(Math.max(...spendByDow));
    const peakDow    = DOW_LABELS[peakDowIdx];

    const daysWithSpend = new Set(outE.map((e) => e.date)).size;
    const avgDaily      = daysWithSpend > 0 ? totalOut/daysWithSpend : 0;

    const essOut  = outE.filter((e) => e.essentiality==="Essential").reduce((a,e)=>a+Number(e.amount),0);
    const discOut = outE.filter((e) => e.essentiality==="Discretionary").reduce((a,e)=>a+Number(e.amount),0);
    const essPct  = totalOut > 0 ? (essOut/totalOut)*100 : 0;
    const discPct = totalOut > 0 ? (discOut/totalOut)*100 : 0;

    let savRate=null, savVerdict=null, savColor=null, overspentM=0;
    if (salary) {
      const activeMo = Object.keys(mOut).length || 1;
      const rate = ((salary - totalOut/activeMo) / salary) * 100;
      savRate = rate;
      if      (rate <  0) { savVerdict="In deficit";    savColor="#B8392B"; }
      else if (rate < 10) { savVerdict="Needs work";    savColor="#B8392B"; }
      else if (rate < 20) { savVerdict="Getting there"; savColor="#C8862E"; }
      else if (rate < 30) { savVerdict="On track";      savColor="#2F7A56"; }
      else                { savVerdict="Excellent";     savColor="#5B8FA8"; }
      Object.values(mOut).forEach((a) => { if (a > salary) overspentM++; });
    }

    return {
      totalOut, totalIn, netPos: totalIn-totalOut,
      outCount: outE.length, inCount: inE.length, totalTx: outE.length+inE.length,
      monthlyOut: mOut,
      bestM, bestAmt: bestM?bestAmt:0, worstM, worstAmt,
      bigJump, bigJumpM,
      allCats, topPayee, uniquePayees, bigTx,
      spendByDow, peakDow, daysWithSpend, avgDaily,
      essOut, discOut, essPct, discPct,
      savRate, savVerdict, savColor, overspentM,
    };
  }, [entries, yearStr, salary]);

  /* ── Closed: dramatic entry card ── */
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ width:"100%", border:"none", cursor:"pointer", background:"none", padding:0, display:"block", textAlign:"left" }}
      >
        <div style={{
          borderRadius:20, padding:"28px 32px 26px",
          background:"linear-gradient(145deg,#0F1620 0%,#1C0C04 40%,#180B1C 70%,#091522 100%)",
          position:"relative", overflow:"hidden",
          boxShadow:"0 0 0 1px rgba(169,133,79,0.22), 0 20px 60px rgba(0,0,0,0.65)",
        }}>
          {/* Prismatic top stripe */}
          <div style={{ position:"absolute",top:0,left:0,right:0,height:4,background:"linear-gradient(90deg,#C8862E 0%,#A9854F 16%,#7C8C5B 33%,#5BA88A 50%,#8C4F5B 66%,#5B8FA8 83%,#8A6FA8 100%)" }} />
          {/* Watermark year */}
          <div style={{ position:"absolute",right:-6,bottom:-14,fontSize:140,fontFamily:"var(--font-serif)",fontWeight:900,color:"transparent",WebkitTextStroke:"1px rgba(169,133,79,0.12)",lineHeight:1,letterSpacing:"-0.06em",pointerEvents:"none",userSelect:"none" }}>
            {yearStr}
          </div>
          {/* Geometric rings */}
          <div style={{ position:"absolute",top:22,right:28,width:68,height:68,borderRadius:"50%",border:"1px solid rgba(169,133,79,0.18)" }} />
          <div style={{ position:"absolute",top:36,right:14,width:42,height:42,borderRadius:"50%",border:"1px solid rgba(91,143,168,0.16)" }} />

          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
              <span style={{ fontSize:16 }}>🎁</span>
              <span style={{ color:"var(--gold)",fontFamily:"var(--font-sans)",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.18em" }}>
                Trakit7 · Annual Wrapped
              </span>
            </div>
            <div style={{ color:"var(--ink-text)",fontFamily:"var(--font-serif)",fontSize:"clamp(1.5rem,6vw,2.1rem)",fontWeight:700,lineHeight:1.05,marginBottom:12 }}>
              Your {yearStr}<br />in Review
            </div>
            <p style={{ color:"var(--ink-text-dim)",fontFamily:"var(--font-sans)",fontSize:12,lineHeight:1.55,marginBottom:24,maxWidth:310 }}>
              7 chapters · Spending story · Monthly chart · Category breakdown · Savings score
            </p>
            <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,var(--gold-deep),var(--gold))",color:"#fff",fontFamily:"var(--font-sans)",fontSize:13,fontWeight:700,borderRadius:10,padding:"10px 22px",boxShadow:"0 4px 20px rgba(200,134,46,0.45)",letterSpacing:"0.01em" }}>
              <span>Open your year</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  /* ── Open: full-screen story modal ── */
  const closeBtnStyle = { background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(236,233,225,0.75)", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, cursor:"pointer", flexShrink:0 };
  const dividerColors  = { top3Acc: "#8A6FA8", habitsAcc: "#A85B86", recordsAcc: "#A9854F", splitAcc: "#5B8FA8" };

  const activeMo = Object.keys(s.monthlyOut).length;

  return (
    <div style={{ position:"fixed",inset:0,zIndex:50,background:"#07090d",overflowY:"auto" }}>

      {/* ── Sticky header ── */}
      <div style={{ position:"sticky",top:0,zIndex:10,background:"rgba(7,9,13,0.9)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 20px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:28,height:3,background:"linear-gradient(90deg,#C8862E,#5BA88A,#8A6FA8)",borderRadius:2 }} />
          <span style={{ color:"rgba(236,233,225,0.85)",fontFamily:"var(--font-sans)",fontSize:13,fontWeight:600 }}>
            {yearStr} Year in Review
          </span>
        </div>
        <button onClick={() => setOpen(false)} style={closeBtnStyle}>✕</button>
      </div>

      <div style={{ maxWidth:600,margin:"0 auto",padding:"18px 14px 64px",display:"flex",flexDirection:"column",gap:14 }}>

        {/* ══ Chapter 1: The Big Picture ══════════════════════════════════ */}
        <Chapter bg="linear-gradient(145deg,#070c1a,#0c1428)" accent="#C8862E">
          <ChapterLabel icon="📊" text="Chapter 1 — The Big Picture" color="#C8862E" />
          <HeroNum value={formatNaira(s.totalOut)} sub={`Total outflow in ${yearStr}`} />
          <StatGrid>
            <StatCell label="Income recorded" value={formatNaira(s.totalIn)}  color="#5BA88A" />
            <StatCell label="Net position"    value={formatNaira(s.netPos)}    color={s.netPos >= 0 ? "#5BA88A" : "#B8392B"} />
            <StatCell label="Total moves"     value={`${s.totalTx}`} />
          </StatGrid>
          <StatGrid>
            <StatCell label="Payments out"   value={`${s.outCount} entries`} />
            <StatCell label="Income in"      value={`${s.inCount} entries`} />
            <StatCell label="Days active"    value={`${s.daysWithSpend} days`} />
          </StatGrid>
          <Story>
            {s.totalTx > 0
              ? `You made ${s.totalTx} financial moves in ${yearStr} — ${s.outCount} payments out and ${s.inCount} income entries. ${s.netPos >= 0 ? `You came out ${formatNaira(s.netPos)} ahead on what you logged.` : `You spent ${formatNaira(Math.abs(s.netPos))} more than recorded income — worth checking whether all income entries are up to date.`}`
              : `No ${yearStr} transactions yet. Start logging and come back to see your story.`
            }
          </Story>
        </Chapter>

        {/* ══ Chapter 2: Monthly Journey ══════════════════════════════════ */}
        <Chapter bg="linear-gradient(145deg,#050e0a,#081812)" accent="#5BA88A">
          <ChapterLabel icon="📅" text="Chapter 2 — Your Monthly Journey" color="#5BA88A" />
          <MonthChart monthlyOut={s.monthlyOut} yearStr={yearStr} accent="#5BA88A" />
          <StatGrid>
            <StatCell label="Quietest month"  value={s.bestM  ? fmtMonthShort(s.bestM)  : "—"} color="#5BA88A" />
            <StatCell label="Lowest spend"    value={s.bestM  ? formatNaira(s.bestAmt)   : "—"} color="#5BA88A" />
            <StatCell label="Busiest month"   value={s.worstM ? fmtMonthShort(s.worstM)  : "—"} color="#C8862E" />
            <StatCell label="Peak spend"      value={s.worstM ? formatNaira(s.worstAmt)  : "—"} color="#C8862E" />
          </StatGrid>
          {s.bigJumpM && (
            <StatGrid>
              <StatCell label="Biggest spike"   value={fmtMonthFull(s.bigJumpM)} />
              <StatCell label="Month-on-month ↑" value={`+${formatNaira(s.bigJump)}`} color="#C8862E" />
            </StatGrid>
          )}
          <Story>
            {s.worstM
              ? `Your spending peaked in ${fmtMonthFull(s.worstM)} at ${formatNaira(s.worstAmt)}.${s.bestM ? ` Your most controlled month was ${fmtMonthFull(s.bestM)}, when you spent just ${formatNaira(s.bestAmt)}.` : ""}${s.bigJumpM ? ` The steepest single-month jump was in ${fmtMonthFull(s.bigJumpM)}, up ${formatNaira(s.bigJump)} from the month before.` : ""}`
              : `No monthly data yet. Log expenses across multiple months to see your trajectory.`
            }
          </Story>
        </Chapter>

        {/* ══ Chapter 3: Where It Went ════════════════════════════════════ */}
        <Chapter bg="linear-gradient(145deg,#0b0813,#141020)" accent="#8A6FA8">
          <ChapterLabel icon="🎯" text="Chapter 3 — Where Your Money Went" color="#8A6FA8" />
          {s.allCats.length > 0 ? (
            <>
              <TopThree allCats={s.allCats} totalOut={s.totalOut} />
              <CatBars allCats={s.allCats} totalOut={s.totalOut} />
            </>
          ) : (
            <p style={{ color:"rgba(167,172,182,0.5)",fontFamily:"var(--font-sans)",fontSize:13,marginTop:8 }}>
              No categorised transactions yet. AI-tagged entries will populate this breakdown.
            </p>
          )}
          <Story>
            {s.allCats.length > 0
              ? `${s.allCats[0][0]} swallowed the largest share — ${s.totalOut > 0 ? ((s.allCats[0][1]/s.totalOut)*100).toFixed(1) : 0}% of everything you spent (${formatNaira(s.allCats[0][1])}). Your top 3 categories together account for ${s.totalOut > 0 ? ((s.allCats.slice(0,3).reduce((a,[,v])=>a+v,0)/s.totalOut)*100).toFixed(0) : 0}% of total outflow. ${s.allCats.length} distinct categories used in total.`
              : "Categorise your transactions to unlock the full breakdown."
            }
          </Story>
        </Chapter>

        {/* ══ Chapter 4: Habits & Rhythm ══════════════════════════════════ */}
        <Chapter bg="linear-gradient(145deg,#110608,#1e0a0d)" accent="#A85B86">
          <ChapterLabel icon="🕐" text="Chapter 4 — Habits & Spending Rhythm" color="#A85B86" />
          <DowChart spendByDow={s.spendByDow} accent="#A85B86" />
          <StatGrid>
            <StatCell label="Peak spending day"  value={s.peakDow}            color="#A85B86" />
            <StatCell label="Avg per active day" value={formatNaira(s.avgDaily)} />
            <StatCell label="Months tracked"     value={`${activeMo}`} />
          </StatGrid>
          <Story>
            {s.totalOut > 0
              ? `${s.peakDow}s are your heaviest spending days. On days you actually spent, your average outflow was ${formatNaira(s.avgDaily)} — that's your per-day baseline to benchmark against.`
              : "Log transactions to discover when and how you spend."
            }
          </Story>
        </Chapter>

        {/* ══ Chapter 5: Hall of Records ══════════════════════════════════ */}
        <Chapter bg="linear-gradient(145deg,#100a04,#1a1208)" accent="#A9854F">
          <ChapterLabel icon="🏆" text="Chapter 5 — Hall of Records" color="#A9854F" />
          {s.bigTx && (
            <div style={{ background:"rgba(169,133,79,0.1)",border:"1px solid rgba(169,133,79,0.22)",borderRadius:12,padding:"14px 16px",marginBottom:16 }}>
              <p style={{ color:"#A9854F",fontFamily:"var(--font-sans)",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>💸 Biggest single spend</p>
              <p style={{ color:"#ECE9E1",fontFamily:"var(--font-serif)",fontSize:"1.7rem",fontWeight:700,marginBottom:4 }}>{formatNaira(Number(s.bigTx.amount))}</p>
              <p style={{ color:"rgba(167,172,182,0.65)",fontFamily:"var(--font-sans)",fontSize:12 }}>
                {s.bigTx.desc || s.bigTx.description || "—"} · {fmtDate(s.bigTx.date)}
                {s.bigTx.beneficiary ? ` · to ${s.bigTx.beneficiary}` : ""}
              </p>
            </div>
          )}
          <StatGrid>
            {s.topPayee && <StatCell label="Most paid payee" value={s.topPayee[0]} />}
            {s.topPayee && <StatCell label="Times paid"      value={`${s.topPayee[1]}×`} color="#A9854F" />}
            <StatCell label="Unique payees" value={`${s.uniquePayees}`} />
          </StatGrid>
          {s.worstM && (
            <StatGrid>
              <StatCell label="Heaviest month"   value={fmtMonthFull(s.worstM)} />
              <StatCell label="Amount that month" value={formatNaira(s.worstAmt)} color="#C8862E" />
            </StatGrid>
          )}
          <Story>
            {s.bigTx
              ? `Your single largest outflow was ${formatNaira(Number(s.bigTx.amount))} on ${fmtDate(s.bigTx.date)}. ${s.topPayee ? `You paid ${s.topPayee[0]} more often than anyone else — ${s.topPayee[1]} time${s.topPayee[1]>1?"s":""}. ` : ""}You spread your money across ${s.uniquePayees} unique payees this year.`
              : "Your standout moments will show here as you log transactions."
            }
          </Story>
        </Chapter>

        {/* ══ Chapter 6: Needs vs Wants ════════════════════════════════════ */}
        <Chapter bg="linear-gradient(145deg,#04080f,#080e1c)" accent="#5B8FA8">
          <ChapterLabel icon="⚖️" text="Chapter 6 — Needs vs. Wants" color="#5B8FA8" />
          <StatGrid>
            <StatCell label="Essential spend"  value={formatNaira(s.essOut)}  color="#5BA88A" />
            <StatCell label="Discretionary"    value={formatNaira(s.discOut)} color="#C8862E" />
            {s.totalOut > (s.essOut + s.discOut) && (
              <StatCell label="Untagged"  value={formatNaira(s.totalOut - s.essOut - s.discOut)} />
            )}
          </StatGrid>
          <SplitBar essPct={s.essPct} discPct={s.discPct} />
          {salary > 0 && (
            <div style={{ marginTop:16,padding:"12px 14px",background:"rgba(91,143,168,0.08)",border:"1px solid rgba(91,143,168,0.15)",borderRadius:10 }}>
              <p style={{ color:"#5B8FA8",fontFamily:"var(--font-sans)",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5 }}>50/30/20 benchmark (monthly)</p>
              <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
                <p style={{ color:"rgba(167,172,182,0.65)",fontFamily:"var(--font-mono)",fontSize:11 }}>Needs ≤ {formatNaira(salary*0.5)}</p>
                <p style={{ color:"rgba(167,172,182,0.65)",fontFamily:"var(--font-mono)",fontSize:11 }}>Wants ≤ {formatNaira(salary*0.3)}</p>
                <p style={{ color:"rgba(167,172,182,0.65)",fontFamily:"var(--font-mono)",fontSize:11 }}>Save ≥ {formatNaira(salary*0.2)}</p>
              </div>
            </div>
          )}
          <Story>
            {s.totalOut > 0
              ? `${s.essPct.toFixed(0)}% of your spending was essential. ${s.discPct.toFixed(0)}% was discretionary — those are the controllable kobo. ${s.discPct > 40 ? "With discretionary spend this high, there's meaningful room to redirect toward savings without sacrificing anything critical." : s.essPct > 75 ? "Most of your spend is non-negotiable, which means cut opportunities are concentrated in that discretionary slice." : "Your needs-vs-wants balance is fairly proportionate."}`
              : "Essentiality tags power this split. They're assigned automatically when the AI categorises your entries."
            }
          </Story>
        </Chapter>

        {/* ══ Chapter 7: Savings Score ═════════════════════════════════════ */}
        {salary > 0 ? (
          <Chapter bg="linear-gradient(145deg,#040c06,#071410)" accent={s.savColor || "#2F7A56"}>
            <ChapterLabel icon="💰" text="Chapter 7 — Your Savings Score" color={s.savColor || "#2F7A56"} />
            {s.savRate !== null && (
              <SavingsGauge rate={s.savRate} verdict={s.savVerdict} color={s.savColor} />
            )}
            <StatGrid>
              <StatCell label="Monthly salary"   value={formatNaira(salary)} />
              <StatCell label="Avg monthly out"  value={formatNaira(s.totalOut / Math.max(activeMo,1))} />
              {s.overspentM > 0 && (
                <StatCell label="Months over salary" value={`${s.overspentM}`} color="#B8392B" />
              )}
            </StatGrid>
            <Story>
              {s.savRate !== null
                ? s.savRate >= 20
                  ? `Solid, Taiwo. A ${s.savRate.toFixed(1)}% average savings rate clears the 20% benchmark. Keep this discipline — at this pace, compound growth starts doing serious work in 3–5 years.`
                  : s.savRate >= 10
                    ? `You're averaging ${s.savRate.toFixed(1)}% saved. You're moving in the right direction but the 20% target is within reach. Identify your top 2 discretionary categories and apply a modest cut to close the gap.`
                    : s.savRate >= 0
                      ? `At ${s.savRate.toFixed(1)}%, the savings muscle is weak. The emergency fund and investment goals stay out of reach until this clears 20%. Pick one category and cut it hard for 60 days.`
                      : `The numbers show you're spending more than your salary on average. Audit your income entries first — if they're accurate, the discretionary spend breakdown in Chapter 6 is your starting point.`
                : "Not enough data to compute savings rate yet."
              }
            </Story>
          </Chapter>
        ) : (
          <Chapter bg="linear-gradient(145deg,#040c06,#071410)" accent="#5BA88A">
            <ChapterLabel icon="💰" text="Chapter 7 — Your Savings Score" color="#5BA88A" />
            <p style={{ color:"rgba(167,172,182,0.6)",fontFamily:"var(--font-sans)",fontSize:13,lineHeight:1.7 }}>
              Set your monthly take-home salary in the Goals tab to unlock your savings rate, 50/30/20 breakdown, and personalised commentary here.
            </p>
          </Chapter>
        )}

        {/* ══ Closing card ════════════════════════════════════════════════ */}
        <div style={{ borderRadius:20,padding:"30px 24px 26px",background:"linear-gradient(135deg,#1a0d02 0%,#0d1520 50%,#180b1a 100%)",border:"1px solid rgba(169,133,79,0.18)",position:"relative",overflow:"hidden",textAlign:"center" }}>
          <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#C8862E,#5BA88A,#8A6FA8)" }} />
          {/* Decorative circles */}
          <div style={{ position:"absolute",top:-30,right:-30,width:100,height:100,borderRadius:"50%",background:"radial-gradient(circle,rgba(169,133,79,0.12),transparent)" }} />
          <div style={{ position:"absolute",bottom:-20,left:20,width:70,height:70,borderRadius:"50%",background:"radial-gradient(circle,rgba(91,143,168,0.1),transparent)" }} />
          <div style={{ fontSize:36,marginBottom:14 }}>🎯</div>
          <h3 style={{ color:"#ECE9E1",fontFamily:"var(--font-serif)",fontSize:"1.5rem",fontWeight:700,marginBottom:10 }}>
            That was {yearStr}.
          </h3>
          <p style={{ color:"rgba(167,172,182,0.65)",fontFamily:"var(--font-sans)",fontSize:13,lineHeight:1.75,maxWidth:380,margin:"0 auto 22px" }}>
            Every transaction you logged is a data point in your financial story. The patterns above are your baseline — what you do with them in {year+1} is where it gets interesting.
          </p>
          <button
            onClick={() => setOpen(false)}
            style={{ display:"inline-flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,var(--gold-deep),var(--gold))",color:"#fff",fontFamily:"var(--font-sans)",fontSize:13,fontWeight:700,borderRadius:10,padding:"11px 26px",boxShadow:"0 4px 20px rgba(200,134,46,0.4)",border:"none",cursor:"pointer",letterSpacing:"0.01em" }}
          >
            Close · See you in {year+1}
          </button>
        </div>

      </div>
    </div>
  );
}
