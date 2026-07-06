"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import SeoTab from "@/components/SeoTab";
import TrendTab from "@/components/TrendTab";

// ── Color system ──────────────────────────────────────────────────────────────
const PINK = { main: "#D4537E", mid: "#E89CB8", light: "#FBEAF0", text: "#993556" };

const CARD_STYLE: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8eaed",
  borderRadius: "12px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
};

const CHANNELS = ["스마트스토어", "쿠팡", "11번가", "G마켓/옥션", "위메프"];
const MONTHS   = ["1월 (JAN)","2월 (FEB)","3월 (MAR)","4월 (APR)","5월 (MAY)","6월 (JUN)","7월 (JUL)","8월 (AUG)","9월 (SEP)","10월 (OCT)","11월 (NOV)","12월 (DEC)"];

// ── Types ─────────────────────────────────────────────────────────────────────
type CandidateStatus = "신규" | "검토" | "실증" | "보류";
interface Candidate { no: string; name: string; category: string; thumb?: string; sell_price: number; margin_pct: number; status: CandidateStatus; keyword: string; }
interface ScoreAxis { score: number; label: string; evidence: string; }
interface ScoreResult { seasonality: ScoreAxis; margin: ScoreAxis; competition: ScoreAxis; channel: ScoreAxis; total: number; verdict: "적극 추천"|"검토 필요"|"보류 권장"; reason: string; }
interface HotKeyword { keyword: string; growth: number; comment: string; }
interface GridCard { id: string; name: string; category: string; status: "실증"|"검토"|"발굴 예정"|"D-60"; reason: string; keyword?: string; matrix_x?: number; matrix_y?: number; }

// ── Scoring helpers ───────────────────────────────────────────────────────────
function scoreBarColor(s: number) { return s >= 70 ? PINK.main : s >= 40 ? PINK.mid : "#F3C9D9"; }
function ScoreBar({ score }: { score: number }) {
  return <div style={{ height:"6px", background:"#f1f5f9", borderRadius:"3px", overflow:"hidden" }}><div style={{ height:"100%", width:`${score}%`, background:scoreBarColor(score), borderRadius:"3px", transition:"width 0.6s ease" }} /></div>;
}

const STATUS_STYLE: Record<CandidateStatus, {bg:string;color:string}> = {
  신규: {bg:"#EFEFF1",color:"#6b7280"}, 검토: {bg:PINK.light,color:PINK.mid},
  실증: {bg:PINK.light,color:PINK.main}, 보류: {bg:"#EFEFF1",color:"#9ca3af"},
};
const VERDICT_STYLE: Record<ScoreResult["verdict"],{bg:string;color:string}> = {
  "적극 추천": {bg:PINK.light,color:PINK.main}, "검토 필요": {bg:PINK.light,color:PINK.mid}, "보류 권장": {bg:"#EFEFF1",color:"#9ca3af"},
};
const GRID_STATUS_STYLE: Record<"실증"|"검토"|"발굴 예정"|"D-60",{bg:string;color:string}> = {
  실증: {bg:PINK.light,color:PINK.main}, 검토: {bg:PINK.light,color:PINK.mid},
  "발굴 예정": {bg:"rgba(255,255,255,0.6)",color:"#6b7280"},
  "D-60": {bg:"rgba(212,83,126,0.18)",color:PINK.main},
};

const SEASONALITY = { CV_EVERGREEN_THRESHOLD:0.15, SCORE_SURGE:88, SCORE_RISING:74, SCORE_PEAK:58, SCORE_FALLING:35, SCORE_OFF:18, EVERGREEN_MIN:60 };
const CHANNEL_RULES: Array<{re:RegExp;score:number;reason:string}> = [
  {re:/화장품|스킨케어|마스크팩|에센스|세럼|선크림|로션|토너/, score:85, reason:"뷰티 — 스마트스토어 상위 매출"},
  {re:/청소|세제|생활용품|주방|조리|냄비|프라이팬/, score:80, reason:"생활용품 — 재구매율 높음"},
  {re:/물놀이|수영|튜브|물총|아쿠아|해수욕|비치|워터파크|수영복|래쉬가드/, score:80, reason:"물놀이 — 여름 시즌 집중 수요"},
  {re:/캠핑|텐트|등산|아웃도어|트레킹|백팩|타프|랜턴|버너|코펠|해먹/, score:78, reason:"캠핑·아웃도어 — 봄·여름 시즌 수요"},
  {re:/핫팩|손난로|방한|귀마개|목도리/, score:78, reason:"방한 소품 — 시즌 수요 명확"},
  {re:/다리미판|다리미|압축팩|유아매트|화분|다육/, score:76, reason:"이지스토리 핵심 카테고리 — 채널 검증됨"},
  {re:/전기장판|온수매트|전기히터|난방/, score:75, reason:"계절 가전 — 시즌 집중 매출"},
  {re:/패딩|점퍼|자켓|코트|가디건|니트|옷|의류/, score:70, reason:"의류 — 반품률 관리 필요"},
  {re:/신발|운동화|샌들|슬리퍼/, score:60, reason:"신발 — 사이즈 반품 주의"},
  {re:/가방|지갑|벨트|액세서리/, score:65, reason:"잡화 — 이미지 품질 중요"},
  {re:/다이어트|건강식품|영양제|프로틴/, score:62, reason:"건강식품 — 재구매 유도"},
  {re:/냉장|냉동|신선|생선|야채|과일/, score:12, reason:"신선식품 — 배송 적합성 낮음"},
  {re:/의료기기|처방|병원|의약품/, score:8, reason:"규제 품목 — 별도 인허가 필요"},
];
function getChannelScore(kw: string): ScoreAxis {
  for (const r of CHANNEL_RULES) if (r.re.test(kw)) return { score:r.score, label:r.score>=75?"우수":r.score>=55?"보통":"주의", evidence:r.reason };
  return { score:50, label:"미분류", evidence:"일반 카테고리 — 추가 검증 필요" };
}

// 채널적합 하이브리드: regex 우선 → 미스 시 LLM 폴백 + 세션 캐시
const _channelCache = new Map<string, ScoreAxis>();
async function getChannelScoreHybrid(kw: string): Promise<ScoreAxis> {
  if (_channelCache.has(kw)) return _channelCache.get(kw)!;
  const sync = getChannelScore(kw);
  if (sync.evidence !== "일반 카테고리 — 추가 검증 필요") { _channelCache.set(kw, sync); return sync; }
  try {
    const res = await fetch("/api/channel-score", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({keyword:kw}) });
    const d = await res.json() as {score:number;label:string;evidence:string};
    const result:ScoreAxis = {score:d.score, label:d.label, evidence:d.evidence+" (AI 분류)"};
    _channelCache.set(kw, result);
    return result;
  } catch { return sync; }
}

async function fetchSeasonality(keyword: string): Promise<ScoreAxis> {
  try {
    // 52주 주별 데이터 요청 — 30일 일별로는 겨울 상품의 여름 저점이 균일하게 나와
    // CV가 낮아 "상시"로 오분류됨. 52주면 연간 계절 진폭을 제대로 포착함.
    const res = await fetch("/api/naver-trend", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({keyword, weeks: 52}) });
    if (!res.body) return {score:50,label:"조회 실패",evidence:"DataLab 조회 실패"};
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      buf += dec.decode(value,{stream:true});
      const lines = buf.split("\n"); buf = lines.pop()??"";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const evt = JSON.parse(line) as {type:string;trend?:{ratios:number[]}};
          if (evt.type==="naver" && evt.trend?.ratios?.length) {
            await reader.cancel();
            const r=evt.trend.ratios, n=r.length, mean=r.reduce((s,x)=>s+x,0)/n;
            if (mean===0) return {score:50,label:"검색량 없음",evidence:"검색량 없음"};
            const std=Math.sqrt(r.reduce((s,x)=>s+(x-mean)**2,0)/n), cv=std/mean;
            // 주별 데이터: 최근 4주 vs 이전 4주로 추세 계산
            const rW=r.slice(-4), pW=r.slice(-8,-4);
            const rA=rW.reduce((s,x)=>s+x,0)/(rW.length||1), pA=pW.reduce((s,x)=>s+x,0)/(pW.length||1);
            const g=pA>0?(rA-pA)/pA:0, cvP=Math.round(cv*100), gS=`${g>=0?"▲":"▼"}${Math.abs(Math.round(g*100))}%`;
            if (cv<SEASONALITY.CV_EVERGREEN_THRESHOLD) return {score:Math.round(Math.max(SEASONALITY.EVERGREEN_MIN,Math.min(100,(1-cv)*110))),label:"상시",evidence:`상시 수요 · CV ${cvP}% · 추세 ${gS}`};
            let score:number,label:string;
            if (g>0.3){score=SEASONALITY.SCORE_SURGE;label="급상승 중";}
            else if(g>0.1){score=SEASONALITY.SCORE_RISING;label="상승 중";}
            else if(g>-0.1){score=SEASONALITY.SCORE_PEAK;label="피크 근처";}
            else if(g>-0.3){score=SEASONALITY.SCORE_FALLING;label="하강 중";}
            else{score=SEASONALITY.SCORE_OFF;label="시즌 종료";}
            return {score,label,evidence:`시즌형 · ${label} · CV ${cvP}% · 추세 ${gS}`};
          }
        } catch {/**/}
      }
    }
  } catch {/**/}
  return {score:50,label:"조회 실패",evidence:"DataLab 조회 실패"};
}

type MarginSource = "resale"|"naver_shop"|"supply"|"unknown";
const MARGIN_LABEL: Record<MarginSource,string> = {resale:"공급사 권장가",naver_shop:"네이버 중앙가",supply:"도매꾹 판매가",unknown:"데이터 없음"};
function marginAxis(p:number,s:MarginSource="unknown"):ScoreAxis {
  const score=Math.min(100,p*2);
  return {score,label:score>=70?"우수":score>=40?"보통":"낮음",evidence:p>0?`마진율 ${p}% · ${MARGIN_LABEL[s]}`:`판매가 데이터 없음 (${MARGIN_LABEL[s]})`};
}
async function fetchCompetition(keyword:string):Promise<ScoreAxis> {
  try {
    const res=await fetch("/api/searchad-cpc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keyword})});
    const j=await res.json() as {competition?:number;monthlySearch?:number};
    const c=j.competition??0.5,score=Math.round((1-c)*100);
    const msLabel = j.monthlySearch && j.monthlySearch > 0 ? ` · 월검색 ${j.monthlySearch < 1000 ? "<1K" : (j.monthlySearch/1000).toFixed(0)+"K"}` : "";
    return {score,label:score>=70?"낮음":score>=40?"보통":"높음",evidence:`경쟁강도 ${(c*100).toFixed(0)}%${msLabel}`};
  } catch {return {score:50,label:"데이터 없음",evidence:"SearchAd 조회 실패"};}
}
function buildVerdict(a:Pick<ScoreResult,"seasonality"|"margin"|"competition"|"channel">,track:"steady"|"season"="steady") {
  const w=track==="season"?{seasonality:0.35,margin:0.30,competition:0.25,channel:0.10}:{seasonality:0.10,margin:0.25,competition:0.30,channel:0.35};
  const total=Math.round(a.seasonality.score*w.seasonality+a.margin.score*w.margin+a.competition.score*w.competition+a.channel.score*w.channel);
  return {total,verdict:(total>=68?"적극 추천":total>=45?"검토 필요":"보류 권장") as ScoreResult["verdict"],reason:`${a.margin.evidence} · ${a.competition.evidence} · ${a.seasonality.evidence}`};
}
function getAxisOrder(s:ScoreResult,track:"steady"|"season") {
  const o=track==="season"
    ?[{key:"시즌성",axis:s.seasonality},{key:"마진",axis:s.margin},{key:"경쟁",axis:s.competition},{key:"채널적합",axis:s.channel}]
    :[{key:"채널적합",axis:s.channel},{key:"경쟁",axis:s.competition},{key:"마진",axis:s.margin},{key:"시즌성",axis:s.seasonality}];
  return o.map((a,i)=>({...a,label:`${"①②③④"[i]} ${a.key}`,highlight:i===0}));
}

// ── DiscoverMatrix: 마진 × 채널적합 4분면 산점도 ──────────────────────────────
function DiscoverMatrix({
  candidates, candidateScores, selected, onSelect, autoScoring, scoredSoFar, baseline,
}: {
  candidates: Candidate[];
  candidateScores: Record<string, ScoreResult>;
  selected: Candidate | null;
  onSelect: (c: Candidate) => void;
  autoScoring?: boolean;
  scoredSoFar?: number;
  baseline?: Array<{id:string; name:string; category:string; margin_score:number; channel_score:number}>;
}) {
  const W=800, H=640, PX=60, PY=52;
  const pw=W-PX*2, ph=H-PY*2;
  const midX=PX+pw/2, midY=PY+ph/2;
  const xFn=(s:number)=>PX+(s/100)*pw;
  const yFn=(s:number)=>PY+(1-s/100)*ph;
  const scored=candidates.filter(c=>candidateScores[c.no]);
  function getAnomaly(sc:ScoreResult):{is:boolean;reason:string} {
    const v=[sc.seasonality.score,sc.margin.score,sc.competition.score,sc.channel.score];
    const gap=Math.max(...v)-Math.min(...v);
    if(gap<=38) return {is:false,reason:""};
    if(sc.seasonality.score>72&&sc.margin.score<42) return {is:true,reason:"검색↑·마진↓"};
    if(sc.channel.score>72&&sc.competition.score<38) return {is:true,reason:"경쟁↑·채널↑"};
    return {is:true,reason:"괴리 신호"};
  }
  const anomalyIds=new Set<string>(
    scored
      .filter(c=>getAnomaly(candidateScores[c.no]).is)
      .sort((a,b)=>{
        const gap=(c:Candidate)=>{const v=[candidateScores[c.no].seasonality.score,candidateScores[c.no].margin.score,candidateScores[c.no].competition.score,candidateScores[c.no].channel.score];return Math.max(...v)-Math.min(...v);};
        return gap(b)-gap(a);
      })
      .slice(0,3)
      .map(c=>c.no)
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect x={PX} y={PY} width={pw/2} height={ph/2} fill="#e8eef8"/>
      <rect x={midX} y={PY} width={pw/2} height={ph/2} fill="#fde8ef"/>
      <rect x={PX} y={midY} width={pw/2} height={ph/2} fill="#eeeeef"/>
      <rect x={midX} y={midY} width={pw/2} height={ph/2} fill="#f3eddf"/>
      <text x={PX+7} y={PY+22} fontSize="18" fill="#6b82a0" fontWeight="500">검토중</text>
      <text x={W-PX-7} y={PY+22} fontSize="18" fill="#b05878" fontWeight="500" textAnchor="end">적극추천</text>
      <text x={PX+7} y={H-PY-8} fontSize="18" fill="#888" fontWeight="500">제외</text>
      <text x={W-PX-7} y={H-PY-8} fontSize="18" fill="#a09060" fontWeight="500" textAnchor="end">보류</text>
      <line x1={midX} y1={PY} x2={midX} y2={H-PY} stroke="#c8d0dc" strokeWidth="1.5" strokeDasharray="6,4"/>
      <line x1={PX} y1={midY} x2={W-PX} y2={midY} stroke="#c8d0dc" strokeWidth="1.5" strokeDasharray="6,4"/>
      {scored.length===0&&(
        <text x={W/2} y={H/2+5} textAnchor="middle" fontSize="18" fill="#c0c4cc">
          {autoScoring?`채점 중… (${scoredSoFar??0}/${candidates.length})`:"채점 결과가 표시됩니다"}
        </text>
      )}
      {(()=>{
        const bl=baseline??[];
        const cats:Record<string,{sumX:number;sumY:number;cnt:number}>={};
        for(const item of bl){
          const k=item.category||"기타";
          if(!cats[k])cats[k]={sumX:0,sumY:0,cnt:0};
          cats[k].sumX+=item.margin_score; cats[k].sumY+=item.channel_score; cats[k].cnt++;
        }
        // 겹침 방지: rawCy 오름차순 정렬 → 이전 라벨과 18px 이내면 아래로 밀기
        const LBLW=58, LBLH=22;
        const rawPos=Object.entries(cats)
          .map(([cat,v])=>({cat,cx:xFn(v.sumX/v.cnt),rawCy:yFn(v.sumY/v.cnt)}))
          .sort((a,b)=>a.rawCy-b.rawCy);
        const placed:{cx:number;boxY:number}[]=[];
        const finalPos=rawPos.map(p=>{
          let boxY=p.rawCy-LBLH-6;
          for(const prev of placed){
            if(Math.abs(p.cx-prev.cx)<LBLW&&Math.abs(boxY-prev.boxY)<LBLH+4){
              boxY=prev.boxY+LBLH+4;
            }
          }
          placed.push({cx:p.cx,boxY});
          return{...p,boxY};
        });
        return(
          <>
            {bl.map(item=>{
              const cx=xFn(item.margin_score), cy=yFn(item.channel_score);
              return(<circle key={`bl-${item.id}`} cx={cx} cy={cy} r="5.5" fill="#d1d5db" stroke="white" strokeWidth="1.5" opacity="0.6"/>);
            })}
            {finalPos.map(({cat,cx,boxY})=>{
              const short=cat.length>4?cat.slice(0,4):cat;
              return(
                <g key={`lbl-${cat}`}>
                  <rect x={cx-29} y={boxY} width="58" height="22" rx="5" fill="rgba(255,255,255,0.88)" stroke="#d1d5db" strokeWidth="1"/>
                  <text x={cx} y={boxY+15} textAnchor="middle" fontSize="14" fill="#6b7280" fontWeight="600">{short}</text>
                </g>
              );
            })}
          </>
        );
      })()}
      {scored.map(c=>{
        const sc=candidateScores[c.no];
        const cx=xFn(sc.margin.score), cy=yFn(sc.channel.score);
        const isSel=selected?.no===c.no, isAnom=anomalyIds.has(c.no);
        const {reason}=getAnomaly(sc);
        const sn=c.name.length>9?c.name.slice(0,9)+"…":c.name;
        // 우측 경계 보정: 라벨박스(96px)가 SVG 밖으로 나가지 않도록 방향 결정
        const ALBLW=96;
        const rightFits=cx+20+ALBLW<W-4;
        const leftFits=cx-20-ALBLW>4;
        const toRight=(cx<=midX||!leftFits)&&rightFits;
        const lx=toRight?cx+20:Math.max(4,cx-ALBLW-20);
        const ly=cy<PY+50?cy+16:cy-42;
        return(
          <g key={c.no} onClick={()=>onSelect(c)} style={{cursor:"pointer"}}>
            {isAnom&&<circle cx={cx} cy={cy} r="18" fill="none" stroke="#e07060" strokeWidth="2.5" strokeDasharray="6,4"/>}
            <circle cx={cx} cy={cy} r={isSel?11:8} fill={isAnom?"#e07060":"#5b8db8"} stroke="white" strokeWidth="2.5"/>
            {isAnom&&(
              <g>
                <line x1={toRight?cx+10:cx-10} y1={cy} x2={toRight?lx:lx+ALBLW} y2={ly+17} stroke="#d4a0a0" strokeWidth="1.2" strokeDasharray="4,3"/>
                <rect x={lx} y={ly} width={ALBLW} height="35" rx="6" fill="rgba(255,255,255,0.97)" stroke="#e0c8c8" strokeWidth="1.2"/>
                <text x={lx+ALBLW/2} y={ly+14} textAnchor="middle" fontSize="15" fill="#1a1a1a" fontWeight="700">{sn}</text>
                <text x={lx+ALBLW/2} y={ly+28} textAnchor="middle" fontSize="13" fill="#c05050">{reason}</text>
              </g>
            )}
          </g>
        );
      })}
      {/* 축 라벨 */}
      <text x={W/2} y={H-PY+32} textAnchor="middle" fontSize="21" fill="#9ca3af" fontWeight="600">마진 →</text>
      <text transform="rotate(-90)" x={-(H/2)} y={22} textAnchor="middle" fontSize="21" fill="#9ca3af" fontWeight="600">채널적합 ↑</text>
    </svg>
  );
}

// ── ProductTimeHeatmap: 상품 × 시간 수요 히트맵 ────────────────────────────────
function ProductTimeHeatmap() {
  // 이지스토리 실제 4개 카테고리
  const PRODS=["압축팩","다리미판","화분","유아매트"];
  const PAST=8, FUTURE=4, TOTAL=PAST+FUTURE;
  const CW=44,CH=44,GAP=10,LPAD=92,THEAD=32,BPAD=28;
  const CELLS_W=LPAD+TOTAL*(CW+GAP)-GAP; // 730
  const W=CELLS_W+72; // 802
  const H=THEAD+PRODS.length*(CH+GAP)-GAP+BPAD;
  // 카테고리 특성 기반 예시 패턴 (과거8주 | 예측4주)
  // 압축팩: 이사·장마 2피크 — 봄 이사철 높고 미래 장마 재상승
  // 다리미판: 상시 평탄
  // 화분: 봄 피크 선행 (col2 정점)
  // 유아매트: 이사·출산 피크, 화분 대비 2주 지연 (col4 정점) → 선행 2주 표시
  const HEAT:number[][]=[
    [0.32,0.42,0.62,0.82,0.90,0.78,0.62,0.48, 0.45,0.52,0.62,0.72],
    [0.55,0.58,0.60,0.62,0.60,0.58,0.55,0.52, 0.52,0.54,0.55,0.57],
    [0.35,0.52,0.88,0.80,0.65,0.50,0.38,0.28, 0.24,0.22,0.20,0.22],
    [0.30,0.38,0.52,0.68,0.90,0.85,0.68,0.50, 0.45,0.48,0.52,0.60],
  ];
  function fill(v:number,future:boolean):string {
    if(future){return v>0.7?"#f4a899":v>0.4?"#fad0c8":"#fde8e4";}
    return v>0.7?"#d96050":v>0.4?"#eba090":v>0.2?"#f4bdb4":"#fde8e4";
  }
  const sepX=LPAD+PAST*(CW+GAP)-GAP/2;
  // 우측 브라켓 주석: 화분(row2) → 유아매트(row3) = "선행 2주" (봄 피크 선행 신호)
  const annY1=THEAD+2*(CH+GAP)+CH/2; // 화분 중심 Y
  const annY2=THEAD+3*(CH+GAP)+CH/2; // 유아매트 중심 Y
  const bX1=CELLS_W+6;  // 브라켓 시작 x = 600
  const bX2=CELLS_W+20; // 브라켓 꺾임 x = 614
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <defs>
        <marker id="hma" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <polygon points="0 0, 7 3.5, 0 7" fill="#8b7355"/>
        </marker>
      </defs>
      <line x1={sepX} y1={THEAD-6} x2={sepX} y2={H-BPAD+4} stroke="#aaa" strokeWidth="1.2" strokeDasharray="4,3"/>
      <text x={sepX} y={THEAD-8} textAnchor="middle" fontSize="10" fill="#888">오늘</text>
      <text x={sepX+8} y={12} fontSize="9.5" fill="#b0987a" fontWeight="500">예측(가상) 구간</text>
      <line x1={sepX+6} y1={14} x2={CELLS_W} y2={14} stroke="#c8b090" strokeWidth="0.8" strokeDasharray="3,2"/>
      {PRODS.flatMap((_,ri)=>Array.from({length:PAST},(_2,ci)=>(
        <rect key={`p${ri}-${ci}`} x={LPAD+ci*(CW+GAP)} y={THEAD+ri*(CH+GAP)} width={CW} height={CH} rx="4" fill={fill(HEAT[ri][ci],false)}/>
      )))}
      {PRODS.flatMap((_,ri)=>Array.from({length:FUTURE},(_2,fi)=>{
        const ci=PAST+fi;
        return <rect key={`f${ri}-${fi}`} x={LPAD+ci*(CW+GAP)} y={THEAD+ri*(CH+GAP)} width={CW} height={CH} rx="4" fill={fill(HEAT[ri][ci],true)} stroke="#d4b8b0" strokeWidth={1} strokeDasharray="4,3"/>;
      }))}
      {PRODS.map((prod,ri)=>(
        <text key={prod} x={LPAD-6} y={THEAD+ri*(CH+GAP)+CH/2+4} textAnchor="end" fontSize={prod.length>6?"9":prod.length>3?"10.5":"11.5"} fill="#374151" fontWeight="500">{prod}</text>
      ))}
      {/* 우측 브라켓 주석 — 셀과 겹치지 않음 */}
      <line x1={bX1} y1={annY1} x2={bX2} y2={annY1} stroke="#8b7355" strokeWidth="1" strokeDasharray="3,2"/>
      <line x1={bX2} y1={annY1} x2={bX2} y2={annY2} stroke="#8b7355" strokeWidth="1.2"/>
      <line x1={bX2} y1={annY2} x2={bX1+3} y2={annY2} stroke="#8b7355" strokeWidth="1.5" markerEnd="url(#hma)"/>
      <text x={bX2+5} y={(annY1+annY2)/2} fontSize="9" fill="#8b7355" fontWeight="600">선행</text>
      <text x={bX2+5} y={(annY1+annY2)/2+12} fontSize="9" fill="#8b7355" fontWeight="600">2주</text>
      {[
        {c:"#d96050",l:"구매확률 높음",d:false},
        {c:"#f4bdb4",l:"낮음",d:false},
        {c:"#fde8e4",l:"예측(가상)",d:true},
      ].map((item,i)=>(
        <g key={i} transform={`translate(${LPAD+i*110},${H-BPAD+12})`}>
          <circle cx="6" cy="5" r="5" fill={item.c} stroke={item.d?"#d4b8b0":"none"} strokeWidth={item.d?1:0}/>
          <text x="16" y="9" fontSize="9.5" fill="#6b7280">{item.l}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DiscoverTab({ onNavigateToContent }: { onNavigateToContent?: (keyword: string) => void } = {}) {
  const [track,setTrack]=useState<"steady"|"season">("steady");
  const [mode,setMode]=useState<"auto"|"manual">("auto");
  const [hotKeywords,setHotKeywords]=useState<HotKeyword[]>([]);
  const [autoSeason,setAutoSeason]=useState("");
  const [autoLoading,setAutoLoading]=useState(false);
  const [manualKw,setManualKw]=useState("");
  const [searchLoading,setSearchLoading]=useState(false);
  const [searchError,setSearchError]=useState("");
  const [candidates,setCandidates]=useState<Candidate[]>([]);
  const [candidateScores,setCandidateScores]=useState<Record<string,ScoreResult>>({});
  const candidateScoresRef=useRef<Record<string,ScoreResult>>({});
  const [autoScoring,setAutoScoring]=useState(false);
  const [autoScoredCount,setAutoScoredCount]=useState(0);
  const [selected,setSelected]=useState<Candidate|null>(null);
  const [scoring,setScoring]=useState<ScoreResult|null>(null);
  const [scoreLoading,setScoreLoading]=useState(false);
  const [gridCards,setGridCards]=useState<GridCard[]>([]);
  const [showSeoModal,setShowSeoModal]=useState(false);
  const [seoModalKw,setSeoModalKw]=useState("");
  const [showTrendModal,setShowTrendModal]=useState(false);
  const [trendModalKw,setTrendModalKw]=useState("");
  const [showRegForm,setShowRegForm]=useState(false);
  const [regChannel,setRegChannel]=useState(CHANNELS[0]);
  const [regMonth,setRegMonth]=useState(MONTHS[0]);
  const [regStatus,setRegStatus]=useState<"실증"|"검토">("실증");
  const [regDone,setRegDone]=useState(false);
  const [adviceText,setAdviceText]=useState("");
  const [generatingAdvice,setGeneratingAdvice]=useState(false);
  const [baselineItems,setBaselineItems]=useState<{id:string;name:string;category:string;margin_score:number;channel_score:number}[]>([]);
  const [d60Cards,setD60Cards]=useState<GridCard[]>([]);

  const inputRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{setCandidateScores({});candidateScoresRef.current={};setScoring(null);},[track]);
  useEffect(()=>{
    const sid=typeof window!=="undefined"?localStorage.getItem("sellfit_store_id"):null;
    if(!sid)return;
    fetch(`/api/discover/baseline?store_id=${encodeURIComponent(sid)}`).then(r=>r.json()).then(j=>{if(j.items)setBaselineItems(j.items);}).catch(()=>{});
  },[]);
  useEffect(()=>{
    const sid=typeof window!=="undefined"?localStorage.getItem("sellfit_store_id"):null;
    if(!sid)return;
    fetch(`/api/discover/cards?store_id=${encodeURIComponent(sid)}`).then(r=>r.json()).then(j=>{if(j.cards)setD60Cards(j.cards);}).catch(()=>{});
  },[]);
  useEffect(()=>{
    if(mode!=="auto"||hotKeywords.length>0)return;
    setAutoLoading(true);
    const run=async()=>{
      try{
        const res=await fetch("/api/naver-trend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"auto"})});
        if(!res.body)return;
        const reader=res.body.getReader();const dec=new TextDecoder();let buf="";
        while(true){const{done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const lines=buf.split("\n");buf=lines.pop()??"";for(const line of lines){if(!line.trim())continue;try{const evt=JSON.parse(line) as {type:string;season?:string;hotKeywords?:HotKeyword[]};if((evt.type==="auto_phase"||evt.type==="auto_final")&&evt.hotKeywords){setAutoSeason(evt.season??"");setHotKeywords(evt.hotKeywords);}}catch{/**/}}}
      }catch{/**/}finally{setAutoLoading(false);}
    };run();
  },[mode,hotKeywords.length]);

  const scoreOne=useCallback(async(c:Candidate):Promise<ScoreResult|null>=>{
    try{
      const[detailRes,seasonality,competition,channel]=await Promise.all([
        fetch("/api/domeggook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"detail",no:c.no,searchKeyword:c.keyword})}).then(r=>r.json()) as Promise<{item?:{margin_pct:number;sell_price:number;margin_source?:MarginSource}}>,
        fetchSeasonality(c.keyword),fetchCompetition(c.keyword),
        getChannelScoreHybrid(c.name+" "+c.keyword),
      ]);
      const ap=detailRes.item?.margin_pct??c.margin_pct,as_=detailRes.item?.margin_source??"unknown";
      if(detailRes.item&&ap!==c.margin_pct){setCandidates(prev=>prev.map(p=>p.no===c.no?{...p,margin_pct:ap,sell_price:detailRes.item!.sell_price}:p));}
      const margin=marginAxis(ap,as_ as MarginSource);
      const{total,verdict,reason}=buildVerdict({seasonality,margin,competition,channel},track);
      const result:ScoreResult={seasonality,margin,competition,channel,total,verdict,reason};
      setCandidateScores(prev=>{const next={...prev,[c.no]:result};candidateScoresRef.current=next;return next;});
      return result;
    }catch{return null;}
  },[track]);

  const autoScoreAll=useCallback(async(items:Candidate[])=>{
    setAutoScoring(true);setAutoScoredCount(0);
    const BATCH=5;
    for(let i=0;i<items.length;i+=BATCH){
      const batch=items.slice(i,i+BATCH);
      await Promise.all(batch.map(c=>scoreOne(c)));
      setAutoScoredCount(prev=>Math.min(prev+batch.length,items.length));
      if(i+BATCH<items.length)await new Promise<void>(r=>setTimeout(r,200));
    }
    setAutoScoring(false);
  },[scoreOne]);

  const searchDomeggook=useCallback(async(kw:string)=>{
    if(!kw.trim())return;
    setSearchLoading(true);setSearchError("");setSelected(null);setScoring(null);
    setCandidateScores({});candidateScoresRef.current={};
    setAutoScoredCount(0);setShowRegForm(false);
    try{
      const res=await fetch("/api/domeggook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"search",keyword:kw})});
      const j=await res.json() as {items?:Omit<Candidate,"status"|"keyword">[];error?:string};
      if(j.error){setSearchError(j.error);setCandidates([]);return;}
      const items=(j.items??[]).map(i=>({...i,keyword:kw,status:"신규"} as Candidate));
      setCandidates(items);
      autoScoreAll(items); // fire-and-forget: 배치 5개씩 병렬, 배치 간 200ms
    }catch{setSearchError("도매꾹 연결 오류");}finally{setSearchLoading(false);}
  },[autoScoreAll]);

  const scoreCandidate=useCallback(async(c:Candidate)=>{
    setSelected(c);setShowRegForm(false);setAdviceText("");setGeneratingAdvice(false);
    const existing=candidateScoresRef.current[c.no];
    if(existing){
      setScoring(existing);setScoreLoading(false);
      setGeneratingAdvice(true);
      fetch("/api/discover-advice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({verdict:existing.verdict,total:existing.total,reason:existing.reason,keyword:c.keyword,seasonality_label:existing.seasonality.label})})
        .then(r=>r.text()).then(t=>{if(t.trim())setAdviceText(t.trim());}).catch(()=>{}).finally(()=>setGeneratingAdvice(false));
      return;
    }
    setScoring(null);setScoreLoading(true);
    const result=await scoreOne(c);
    if(result){
      setScoring(result);
      setGeneratingAdvice(true);
      fetch("/api/discover-advice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({verdict:result.verdict,total:result.total,reason:result.reason,keyword:c.keyword,seasonality_label:result.seasonality.label})})
        .then(r=>r.text()).then(t=>{if(t.trim())setAdviceText(t.trim());}).catch(()=>{}).finally(()=>setGeneratingAdvice(false));
    }else{setScoring(null);}
    setScoreLoading(false);
  },[scoreOne]);

  const openRegForm=useCallback((ds:"실증"|"검토")=>{
    setRegChannel((scoring?.channel.score??0)>=70?"스마트스토어":CHANNELS[0]);
    setRegMonth(MONTHS[0]);setRegStatus(ds);setShowRegForm(true);
  },[scoring]);

  const handleRegister=useCallback(async()=>{
    if(!selected)return;
    const reason=scoring?(track==="season"?scoring.seasonality.evidence:scoring.channel.evidence):(selected.margin_pct>0?`마진 ${selected.margin_pct}%`:"미채점");
    // 3번 규칙: X=시즌성, Y=마진 → Diagnose 매트릭스 좌표
    const matrixX=scoring?scoring.seasonality.score:50;
    const matrixY=scoring?scoring.margin.score:(selected.margin_pct>0?selected.margin_pct:50);
    setCandidates(prev=>prev.map(c=>c.no===selected.no?{...c,status:regStatus}:c));
    setSelected(prev=>prev?{...prev,status:regStatus}:prev);
    const card:GridCard={id:selected.no,name:selected.name,category:selected.category,status:regStatus,reason:`${regChannel} · ${regMonth} · ${reason}`,keyword:selected.keyword,matrix_x:matrixX,matrix_y:matrixY};
    setGridCards(prev=>{const idx=prev.findIndex(c=>c.id===selected.no);if(idx>=0)return prev.map((c,i)=>i===idx?card:c);return[...prev,card];});
    // Diagnose 매트릭스 연동: store_id 있으면 DB에 등록
    const storeId=typeof window!=="undefined"?localStorage.getItem("sellfit_store_id"):null;
    if(storeId){
      try{
        // purchase_price: sell_price × (1 - margin_pct/100) 역산 — DiagnosisTab 재계산 로직 활성화
        const derivedPurchasePrice=selected.sell_price>0&&selected.margin_pct>0
          ?Math.round(selected.sell_price*(1-selected.margin_pct/100)):0;
        await fetch("/api/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({store_id:storeId,name:selected.name,url:selected.no?`https://domeggook.com/product/${selected.no}`:null,keyword:selected.keyword,category:selected.category,price:selected.sell_price||0,purchase_price:derivedPurchasePrice,is_own:2,matrix_x:matrixX,matrix_y:matrixY})});
      }catch{/* 실패 무시 — 발굴현황엔 이미 반영됨 */}
    }
    setRegDone(true);setTimeout(()=>{setShowRegForm(false);setRegDone(false);},900);// 자동 이동 없음. 등록만 하고 Discover에 남음.
  },[selected,scoring,track,regChannel,regMonth,regStatus]);

  const gateHold=useCallback(()=>{
    if(!selected)return;
    setCandidates(prev=>prev.map(c=>c.no===selected.no?{...c,status:"보류"}:c));
    setSelected(prev=>prev?{...prev,status:"보류"}:prev);setShowRegForm(false);
  },[selected]);

  const scoredCount=Object.keys(candidateScores).length;
  const visibleCandidates=candidates.filter(c=>c.status!=="보류").sort((a,b)=>(candidateScores[b.no]?.total??-1)-(candidateScores[a.no]?.total??-1));
  const discoveryCards:GridCard[]=hotKeywords.filter(kw=>!gridCards.some(c=>c.keyword===kw.keyword)).slice(0,Math.max(0,6-gridCards.length)).map(kw=>({id:`hot-${kw.keyword}`,name:kw.keyword,category:"시즌 키워드",status:"발굴 예정" as const,reason:kw.growth!==0?`${kw.growth>0?"▲":"▼"}${Math.abs(kw.growth)}% 트렌드${kw.comment?` · ${kw.comment}`:""}`:kw.comment||"시즌 추천",keyword:kw.keyword}));
  const allGridCards:GridCard[]=[...gridCards,...d60Cards,...discoveryCards];

  const selectStyle:React.CSSProperties={width:"100%",height:"36px",padding:"0 10px",fontSize:"13px",border:`1.5px solid ${PINK.mid}`,borderRadius:"8px",background:"#fff",color:"#111",fontFamily:"inherit",outline:"none"};

  return (
    <div style={{ fontFamily:"'Pretendard', -apple-system, sans-serif", color:"#111" }}>

      {/* ── Sidebar + Content (Optimize 패턴) ─────────────────────────────── */}
      <div style={{ display:"flex", gap:"40px", alignItems:"flex-start" }}>

        {/* Left sidebar */}
        <div style={{ width:"200px", flexShrink:0, background:"#F7F8FA", borderRadius:"8px", padding:"14px 12px", borderRight:"1px solid #e8eaed", alignSelf:"start", position:"sticky", top:"60px" }}>
          <p style={{ fontSize:"10px", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em", color:"#9ca3af", marginBottom:"8px" }}>DISCOVER</p>
          <p style={{ fontSize:"14px", fontWeight:700, color:"#1a1a1a", lineHeight:1.4, marginBottom:"6px" }}>무엇을 팔지,<br/>먼저 찾는다</p>
          <p style={{ fontSize:"13px", color:"#6b7280", marginBottom:"14px", lineHeight:1.5 }}>도매 발굴 → 자동 4축 채점</p>
          {[
            `${track==="steady"?"① 채널적합":"① 시즌성"} (1순위)`,
            `${track==="steady"?"② 경쟁":"② 마진"}`,
            `${track==="steady"?"③ 마진":"③ 경쟁"}`,
            `${track==="steady"?"④ 시즌성":"④ 채널적합"}`,
          ].map(f=>(
            <div key={f} style={{ display:"flex", alignItems:"center", gap:"5px", marginBottom:"7px" }}>
              <span style={{ fontSize:"10px", color:"#c0c4cc", flexShrink:0 }}>✓</span>
              <span style={{ fontSize:"13px", color:"#8f9399" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Right: all content */}
        <div style={{ flex:1, minWidth:0 }}>
        <div style={{ maxWidth: "1232px", margin: "0 auto" }}>

          {/* Hero — with bottom border */}
          <div style={{ paddingBottom:"16px", marginBottom:"16px", borderBottom:"1px solid #e8eaed" }}>
            <h1 style={{ fontSize:"28px", fontWeight:800, letterSpacing:"-0.02em", color:"#0d0d0e", margin:"0 0 6px" }}>Find What To Sell.</h1>
            <p style={{ fontSize:"14px", color:"#4b5563", margin:"0 0 10px", lineHeight:1.6 }}>무엇을 팔지, 먼저 찾는다.</p>
            <p style={{ fontSize:"14px", color:"#4b5563", margin:0, lineHeight:1.6 }}>시즌 상품을 도매에서 발굴하고 데이터로 매긴다. 고르는 건 당신이다.</p>
          </div>

          {/* Track toggle + Mode toggle */}
          <div style={{ marginBottom:"16px" }}>
            <div style={{ marginBottom:"12px" }}>
              <div style={{ fontSize:"11px", color:"#9ca3af", fontWeight:600, marginBottom:"8px", letterSpacing:"0.05em", textTransform:"uppercase" }}>발굴 트랙</div>
              <div style={{ display:"inline-flex", gap:"8px" }}>
                {(["steady","season"] as const).map(t=>(
                  <button key={t} onClick={()=>setTrack(t)} style={{ padding:"8px 22px", borderRadius:"20px", fontSize:"13px", fontWeight:600, border:`1.5px solid ${track===t?PINK.main:"#e5e7eb"}`, background:track===t?PINK.main:"#fff", color:track===t?"#fff":"#6b7280", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
                    {t==="steady"?"상시 발굴":"시즌 발굴"}
                  </button>
                ))}
              </div>
              <p style={{ fontSize:"12px", color:"#9ca3af", margin:"8px 0 0", lineHeight:1.4 }}>
                {track==="steady"?"채널적합 · 경쟁 · 마진 · 시즌성 순으로 평가합니다":"시즌성 · 마진 · 경쟁 · 채널적합 순으로 평가합니다"}
              </p>
            </div>
            <div style={{ display:"inline-flex", border:"1px solid #e5e7eb", borderRadius:"8px", overflow:"hidden", background:"#f9fafb" }}>
              {(["auto","manual"] as const).map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{ padding:"7px 18px", fontSize:"13px", fontWeight:mode===m?700:500, background:mode===m?"#111":"transparent", color:mode===m?"#fff":"#6b7280", border:"none", cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit" }}>
                  {m==="auto"?"자동 발굴":"수동 검색"}
                </button>
              ))}
            </div>
          </div>

          {/* Search area */}
          {mode==="auto"?(
            <div style={{ marginBottom:"32px" }}>
              <div style={{ fontSize:"12px", color:"#9ca3af", marginBottom:"12px", fontWeight:500 }}>
                {autoLoading?"시즌 키워드 분석 중…":autoSeason?`${autoSeason} 시즌 추천 키워드`:"추천 키워드"}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                {autoLoading&&hotKeywords.length===0
                  ?Array.from({length:5}).map((_,i)=><div key={i} style={{ width:"80px", height:"32px", background:PINK.light, borderRadius:"16px" }}/>)
                  :hotKeywords.map(k=>(
                    <button key={k.keyword} onClick={()=>{setTrack("season");searchDomeggook(k.keyword);}} style={{ padding:"6px 14px", borderRadius:"16px", fontSize:"13px", fontWeight:600, border:`1px solid ${PINK.mid}`, background:PINK.light, color:PINK.text, cursor:"pointer", display:"flex", alignItems:"center", gap:"6px", fontFamily:"inherit" }}>
                      {k.keyword}
                      {k.growth!==0&&<span style={{ fontSize:"11px", color:k.growth>0?PINK.main:"#9ca3af" }}>{k.growth>0?`▲${k.growth}%`:`▼${Math.abs(k.growth)}%`}</span>}
                    </button>
                  ))
                }
              </div>
            </div>
          ):(
            <div style={{ marginBottom:"32px" }}>
              <div style={{ display:"flex", gap:"8px" }}>
                <input ref={inputRef} type="text" value={manualKw} onChange={e=>setManualKw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchDomeggook(manualKw)} placeholder="키워드 입력 (예: 핫팩, 방한장갑)" style={{ flex:1, height:"38px", padding:"0 12px", fontSize:"14px", border:"1px solid #e5e7eb", borderRadius:"8px", outline:"none", fontFamily:"inherit" }}/>
                <button onClick={()=>searchDomeggook(manualKw)} disabled={searchLoading} style={{ height:"38px", padding:"0 20px", background:PINK.main, color:"#fff", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:700, cursor:searchLoading?"not-allowed":"pointer", opacity:searchLoading?0.7:1, fontFamily:"inherit" }}>
                  {searchLoading?"검색 중…":"검색"}
                </button>
              </div>
              {searchError&&<p style={{ fontSize:"12px", color:"#dc2626", marginTop:"8px" }}>{searchError}</p>}
            </div>
          )}

          {/* ── 발굴 매트릭스 + 수요 히트맵 (검색창 바로 아래, 전체폭, 항상 표시) ── */}
          <div style={{ marginBottom:"24px" }}>
            <div style={{ ...CARD_STYLE, padding:"18px 20px 16px", marginBottom:"16px" }}>
              <p style={{ fontSize:"18px", color:"#0d0d0e", fontWeight:800, letterSpacing:"-0.01em", margin:"0 0 12px 2px" }}>
                Discover Matrix
                {autoScoring&&<span style={{ fontSize:"12px", marginLeft:"12px", color:PINK.mid, fontWeight:500 }}>채점 중… {autoScoredCount}/{candidates.length}</span>}
              </p>
              <DiscoverMatrix
                candidates={visibleCandidates}
                candidateScores={candidateScores}
                selected={selected}
                onSelect={scoreCandidate}
                autoScoring={autoScoring}
                scoredSoFar={autoScoredCount}
                baseline={baselineItems}
              />
            </div>
            <div style={{ ...CARD_STYLE, padding:"18px 20px 16px" }}>
              <p style={{ fontSize:"18px", color:"#0d0d0e", fontWeight:800, letterSpacing:"-0.01em", margin:"0 0 12px 2px" }}>Demand Forecast</p>
              <div style={{ padding:"5px 10px", background:"#fef9c3", border:"1px solid #fde68a", borderRadius:"6px", marginBottom:"12px", display:"inline-block" }}>
                <p style={{ fontSize:"11px", color:"#92400e", margin:0, fontWeight:600 }}>잠정값 · 사방넷 연동 후 실제 매출 데이터로 교체 예정</p>
              </div>
              <ProductTimeHeatmap />
            </div>
          </div>

          {/* Board: 34fr 66fr */}
          <div style={{ display:"grid", gridTemplateColumns:"34fr 66fr", gap:"24px", alignItems:"start" }}>

            {/* Left: candidate list card */}
            <div style={{ ...CARD_STYLE, height:"560px", overflowY:"auto", padding:"16px" }}>
              <div style={{ fontSize:"12px", color:"#9ca3af", fontWeight:500, marginBottom:"12px" }}>
                후보 상품{visibleCandidates.length>0?` (${visibleCandidates.length})`:""}
                {scoredCount>0&&<span style={{ marginLeft:"6px" }}>· 점수 높은 순</span>}
              </div>
              {searchLoading?(
                <div>{Array.from({length:4}).map((_,i)=><div key={i} style={{ height:"80px", background:"#f9fafb", borderRadius:"8px", marginBottom:"8px" }}/>)}</div>
              ):visibleCandidates.length===0?(
                <div style={{ padding:"40px 16px", textAlign:"center" }}>
                  <div style={{ fontSize:"24px", marginBottom:"8px" }}>🔍</div>
                  <p style={{ fontSize:"13px", color:"#9ca3af", margin:0 }}>키워드를 검색하면 후보 상품이 나타납니다</p>
                </div>
              ):(
                <div>
                  {visibleCandidates.map(c=>{
                    const isSel=selected?.no===c.no,st=STATUS_STYLE[c.status],cs=candidateScores[c.no];
                    return(
                      <button key={c.no} onClick={()=>scoreCandidate(c)} style={{ width:"100%", textAlign:"left", padding:"14px 16px", marginBottom:"8px", background:isSel?PINK.light:"#fff", border:`1px solid ${isSel?PINK.main:"#e5e7eb"}`, borderRadius:"10px", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px" }}>
                          <span style={{ fontSize:"10px", fontWeight:700, padding:"2px 8px", borderRadius:"4px", background:st.bg, color:st.color }}>{c.status}</span>
                          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                            {cs&&<span style={{ fontSize:"12px", fontWeight:700, color:scoreBarColor(cs.total) }}>{cs.total}점</span>}
                            {(()=>{const ms=c.margin_pct>0?Math.min(100,c.margin_pct*2):null;return <span style={{ fontSize:"11px", fontWeight:600, color:ms!=null?scoreBarColor(ms):"#d1d5db" }}>{ms!=null?`마진 ${ms}점`:"마진 —"}</span>;})()}
                          </div>
                        </div>
                        <p style={{ fontSize:"13px", fontWeight:600, color:"#111", margin:"4px 0 2px", lineHeight:1.3 }}>{c.name.length>28?c.name.slice(0,28)+"…":c.name}</p>
                        {c.sell_price>0&&<p style={{ fontSize:"12px", color:"#9ca3af", margin:0 }}>{c.sell_price.toLocaleString()}원</p>}
                        {!cs&&<p style={{ fontSize:"11px", color:"#bfbfbf", margin:"4px 0 0" }}>{autoScoring?"채점 중…":"클릭하여 상세 분석"}</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: scoring card + reg form + SEO */}
            <div>
              {!selected&&!scoreLoading?(
                <div style={{ ...CARD_STYLE, padding:"56px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:"28px", marginBottom:"12px" }}>📊</div>
                  <p style={{ fontSize:"14px", color:"#9ca3af", margin:0 }}>후보 상품을 클릭하면 4축 채점이 시작됩니다</p>
                </div>
              ):(
                <div style={{ ...CARD_STYLE, padding:"24px 28px" }}>
                  <div style={{ marginBottom:"24px" }}>
                    <h3 style={{ fontSize:"15px", fontWeight:700, margin:"0 0 4px" }}>{(selected?.name?.length??0)>36?selected!.name.slice(0,36)+"…":selected?.name}</h3>
                    <p style={{ fontSize:"12px", color:"#9ca3af", margin:0 }}>{selected?.category}</p>
                  </div>
                  {scoreLoading?(
                    <div>
                      {(selected?.margin_pct??0)>0?(()=>{const ms=Math.min(100,selected!.margin_pct*2),lbl=ms>=70?"우수":ms>=40?"보통":"낮음";return(<>
                        <div style={{ marginBottom:"16px",padding:"12px 14px",marginLeft:"-14px",marginRight:"-14px",background:PINK.light,borderRadius:"8px",border:`1px solid ${PINK.mid}` }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                            <span style={{ fontSize:"14px", fontWeight:700, color:PINK.text }}>마진</span>
                            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                              <span style={{ fontSize:"12px", color:"#6b7280" }}>{lbl}</span>
                              <span style={{ fontSize:"18px", fontWeight:800, color:scoreBarColor(ms) }}>{ms}</span>
                            </div>
                          </div>
                          <ScoreBar score={ms}/>
                          <p style={{ fontSize:"11px", color:"#9ca3af", margin:"4px 0 0" }}>마진율 {selected!.margin_pct}% · 시즌성·경쟁·채널 분석 중...</p>
                        </div>
                        {[0,1,2].map(i=><div key={i} style={{ marginBottom:"18px" }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}><div style={{ width:"80px", height:"14px", background:"#f1f5f9", borderRadius:"4px" }}/><div style={{ width:"48px", height:"14px", background:"#f1f5f9", borderRadius:"4px" }}/></div><div style={{ height:"6px", background:"#f1f5f9", borderRadius:"3px" }}/></div>)}
                      </>);})()
                      :<>{[0,1,2,3].map(i=><div key={i} style={{ marginBottom:"18px" }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}><div style={{ width:"80px", height:"14px", background:"#f1f5f9", borderRadius:"4px" }}/><div style={{ width:"48px", height:"14px", background:"#f1f5f9", borderRadius:"4px" }}/></div><div style={{ height:"6px", background:"#f1f5f9", borderRadius:"3px" }}/></div>)}</>}
                    </div>
                  ):scoring?(
                    <>
                      {getAxisOrder(scoring,track).map(({label,axis,highlight})=>(
                        <div key={label} style={{ marginBottom:"16px",...(highlight?{padding:"12px 14px",marginLeft:"-14px",marginRight:"-14px",background:PINK.light,borderRadius:"8px",border:`1px solid ${PINK.mid}`}:{}) }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                            <span style={{ fontSize:highlight?"14px":"13px", fontWeight:highlight?700:600, color:highlight?PINK.text:"#374151" }}>{label}</span>
                            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                              <span style={{ fontSize:"12px", color:"#6b7280" }}>{axis.label}</span>
                              <span style={{ fontSize:highlight?"18px":"14px", fontWeight:700, color:scoreBarColor(axis.score) }}>{axis.score}</span>
                            </div>
                          </div>
                          <ScoreBar score={axis.score}/>
                          <p style={{ fontSize:"11px", color:"#9ca3af", margin:"4px 0 0" }}>{axis.evidence}</p>
                        </div>
                      ))}
                      <div style={{ marginTop:"24px", padding:"16px", background:PINK.light, borderRadius:"10px", border:`1px solid ${PINK.mid}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                          <span style={{ fontSize:"14px", fontWeight:700 }}>총점</span>
                          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                            <span style={{ fontSize:"22px", fontWeight:800, color:scoreBarColor(scoring.total) }}>{scoring.total}</span>
                            <span style={{ fontSize:"12px", fontWeight:700, padding:"3px 10px", borderRadius:"6px", background:VERDICT_STYLE[scoring.verdict].bg, color:VERDICT_STYLE[scoring.verdict].color }}>{scoring.verdict}</span>
                          </div>
                        </div>
                        <p style={{ fontSize:"12px", color:"#6b7280", margin:0, lineHeight:1.5 }}>{scoring.reason}</p>
                      </div>
                      {/* AI 해설 레이어 */}
                      {(generatingAdvice||adviceText)&&(
                        <div style={{ marginTop:"12px", padding:"12px 14px", background:"#f9fafb", borderRadius:"8px", border:"1px solid #e5e7eb" }}>
                          <p style={{ fontSize:"11px", fontWeight:700, color:"#6b7280", margin:"0 0 6px", letterSpacing:"0.05em" }}>AI 코멘트</p>
                          {generatingAdvice&&!adviceText
                            ?<div style={{ display:"flex", alignItems:"center", gap:"6px" }}><span style={{ width:"10px",height:"10px",border:"2px solid #e5e7eb",borderTopColor:"#ef567c",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite" }}/><span style={{ fontSize:"12px",color:"#9ca3af" }}>분석 중...</span></div>
                            :<p style={{ fontSize:"13px", color:"#374151", margin:0, lineHeight:1.7 }}>{adviceText}</p>}
                        </div>
                      )}
                      {!showRegForm&&(
                        <div style={{ display:"flex", gap:"8px", marginTop:"16px" }}>
                          <button onClick={()=>openRegForm("실증")} style={{ flex:1, height:"36px", background:PINK.main, color:"#fff", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>채널 확정 ✓</button>
                          <button onClick={()=>openRegForm("검토")} style={{ flex:1, height:"36px", background:PINK.light, color:PINK.main, border:`1px solid ${PINK.mid}`, borderRadius:"8px", fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>검토 중 ⟳</button>
                          <button onClick={gateHold} style={{ flex:1, height:"36px", background:"#EFEFF1", color:"#6b7280", border:"1px solid #e5e7eb", borderRadius:"8px", fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>보류 ✕</button>
                        </div>
                      )}
                      {scoring&&!showRegForm&&(
                        <button onClick={()=>{setTrendModalKw(selected?.keyword||"");setShowTrendModal(true);}} style={{ width:"100%", height:"34px", marginTop:"8px", background:"#f9fafb", color:"#4a4f57", border:"1px solid #e5e7eb", borderRadius:"8px", fontSize:"12px", fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:"5px" }}>🔍 트렌드 상세 분석 →</button>
                      )}
                      {scoring&&!showRegForm&&(
                        <div style={{ marginTop:"12px", display:"flex", flexDirection:"column", gap:"8px" }}>
                          <button onClick={()=>{setSeoModalKw(selected?.name||"");setShowSeoModal(true);}} style={{ width:"100%", height:"36px", background:PINK.light, color:PINK.text, border:`1px solid ${PINK.mid}`, borderRadius:"8px", fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>✏️ 상품명 최적화</button>
                          {track==="season"&&selected?.status==="실증"&&<div style={{ padding:"10px 14px", background:PINK.light, borderRadius:"8px", fontSize:"12px", color:PINK.text }}>📅 시즌 상품 — Calendar에서 시즌 일정 관리</div>}
                        </div>
                      )}
                    </>
                  ):null}
                </div>
              )}

              {/* Registration form */}
              {showRegForm&&selected&&(
                <div style={{ marginTop:"12px", ...CARD_STYLE, border:`1.5px solid ${PINK.main}`, padding:"20px 24px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
                    <p style={{ fontSize:"13px", fontWeight:700, color:PINK.text, margin:0 }}>등록 정보 입력</p>
                    <button onClick={()=>setShowRegForm(false)} style={{ width:"24px", height:"24px", background:"#f1f5f9", color:"#6b7280", border:"none", borderRadius:"4px", fontSize:"12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>✕</button>
                  </div>
                  <div style={{ marginBottom:"12px" }}>
                    <label style={{ fontSize:"11px", fontWeight:600, color:"#6b7280", display:"block", marginBottom:"4px" }}>상품명</label>
                    <div style={{ height:"36px", padding:"0 10px", fontSize:"13px", color:"#6b7280", border:"1px solid #e5e7eb", borderRadius:"8px", background:"#f9fafb", display:"flex", alignItems:"center", overflow:"hidden" }}>
                      {selected.name.length>40?selected.name.slice(0,40)+"…":selected.name}
                    </div>
                  </div>
                  <div style={{ marginBottom:"12px" }}>
                    <label style={{ fontSize:"11px", fontWeight:600, color:"#6b7280", display:"block", marginBottom:"4px" }}>배정 채널</label>
                    <select value={regChannel} onChange={e=>setRegChannel(e.target.value)} style={selectStyle}>{CHANNELS.map(ch=><option key={ch} value={ch}>{ch}</option>)}</select>
                  </div>
                  <div style={{ marginBottom:"12px" }}>
                    <label style={{ fontSize:"11px", fontWeight:600, color:"#6b7280", display:"block", marginBottom:"4px" }}>배정 시즌</label>
                    <select value={regMonth} onChange={e=>setRegMonth(e.target.value)} style={selectStyle}>{MONTHS.map(m=><option key={m} value={m}>{m}</option>)}</select>
                  </div>
                  <div style={{ marginBottom:"16px" }}>
                    <label style={{ fontSize:"11px", fontWeight:600, color:"#6b7280", display:"block", marginBottom:"8px" }}>상태</label>
                    <div style={{ display:"flex", gap:"16px" }}>
                      {(["실증","검토"] as const).map(s=>(
                        <label key={s} style={{ display:"flex", alignItems:"center", gap:"6px", cursor:"pointer", fontSize:"13px", fontWeight:regStatus===s?700:500, color:regStatus===s?PINK.text:"#6b7280" }}>
                          <input type="radio" name="regStatus" value={s} checked={regStatus===s} onChange={()=>setRegStatus(s)} style={{ accentColor:PINK.main }}/>
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleRegister} disabled={regDone} style={{ width:"100%", height:"40px", background:regDone?"#22c55e":PINK.main, color:"#fff", border:"none", borderRadius:"8px", fontSize:"14px", fontWeight:700, cursor:regDone?"default":"pointer", fontFamily:"inherit", transition:"background 0.2s" }}>{regDone?"등록완료 ✓":"확정 → 등록"}</button>
                </div>
              )}

            </div>
          </div>

          {/* ── WHY card — 흰색 카드 (dark band 제거) ── */}
          <div style={{ ...CARD_STYLE, border:"1.5px solid #d8dadc", boxShadow:"0 6px 24px rgba(0,0,0,0.09)", padding:"24px 32px", margin:"24px 0" }}>
            <p style={{ fontSize:"11px", color:PINK.main, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 14px" }}>Why This Works</p>
            <h2 style={{ fontSize:"26px", fontWeight:800, color:"#0d0d0e", margin:"0 0 12px", letterSpacing:"-0.02em" }}>발굴은 전략이다.</h2>
            <p style={{ fontSize:"15px", color:"#6b7280", margin:0, lineHeight:1.6 }}>먼저 찾는 자가 시즌을 갖는다.</p>
          </div>

          {/* ── 발굴 현황 ── */}
          <div style={{ marginBottom:"24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"20px" }}>
              <div>
                <h2 style={{ fontSize:"20px", fontWeight:800, margin:"0 0 4px", letterSpacing:"-0.01em" }}>발굴 현황</h2>
                <p style={{ fontSize:"13px", color:"#9ca3af", margin:0 }}>발굴·채점된 상품이 쌓입니다 — 클릭하면 분석 진입</p>
              </div>
              <span style={{ fontSize:"13px", fontWeight:600, color:"#6b7280" }}>실증 {gridCards.filter(c=>c.status==="실증").length} · 검토 {gridCards.filter(c=>c.status==="검토").length}{d60Cards.length>0?` · D-60 ${d60Cards.length}`:""} · 발굴 예정 {allGridCards.filter(c=>c.status==="발굴 예정").length}</span>
            </div>
            {allGridCards.length===0?(
              <div style={{ padding:"48px 24px", textAlign:"center", background:"#fff", borderRadius:"12px", border:"1px dashed #e5e7eb" }}>
                <div style={{ fontSize:"28px", marginBottom:"12px" }}>📦</div>
                <p style={{ fontSize:"14px", color:"#9ca3af", margin:0 }}>키워드 검색 후 상품을 확정하면 여기 쌓입니다</p>
              </div>
            ):(
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"12px" }}>
                {allGridCards.map(card=>{
                  const st=GRID_STATUS_STYLE[card.status];
                  return(
                    <div key={card.id}
                      style={{ padding:"20px", minHeight:"160px", background:"linear-gradient(135deg, #ccd9f0 0%, #ecd4e3 100%)", border:"1px solid rgba(255,255,255,0.6)", borderRadius:"12px", cursor:card.status==="발굴 예정"?"pointer":"default", transition:"box-shadow 0.15s" }}
                      onClick={()=>{if(card.status==="발굴 예정"&&card.keyword){setTrack("season");searchDomeggook(card.keyword);window.scrollTo({top:0,behavior:"smooth"});}}}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                        <span style={{ fontSize:"11px", fontWeight:700, padding:"3px 9px", borderRadius:"4px", background:st.bg, color:st.color }}>{card.status}</span>
                        {card.status==="실증"&&(
                          <button onClick={e=>{e.stopPropagation(); onNavigateToContent&&onNavigateToContent(card.name);}} style={{ fontSize:"11px", padding:"3px 9px", background:"rgba(255,255,255,0.8)", color:PINK.text, border:`1px solid ${PINK.mid}`, borderRadius:"4px", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>Content →</button>
                        )}
                      </div>
                      <p style={{ fontSize:"16px", fontWeight:800, color:"#111", margin:"0 0 4px", lineHeight:1.2, letterSpacing:"-0.01em" }}>{card.name.length>28?card.name.slice(0,28)+"…":card.name}</p>
                      <p style={{ fontSize:"12px", color:"#666", margin:"0 0 8px" }}>{card.category}</p>
                      <p style={{ fontSize:"12px", color:"#555", margin:0, lineHeight:1.6 }}>{card.reason}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


        </div>{/* /Right column inner 1232px */}
        </div>{/* /Right column flex:1 */}
      </div>{/* /Sidebar+Content flex */}

      {/* ② 트렌드 상세 분석 모달 */}
      {showTrendModal&&(
        <div
          style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setShowTrendModal(false)}
        >
          <div
            style={{ background:"#fff", borderRadius:"14px", width:"min(900px,95vw)", maxHeight:"88vh", overflow:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.18)" }}
            onClick={e=>e.stopPropagation()}
          >
            <div style={{ padding:"16px 24px", borderBottom:"1px solid #e8eaed", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"#fff", zIndex:1 }}>
              <div>
                <p style={{ fontSize:"11px", fontWeight:600, color:PINK.main, letterSpacing:"0.06em", textTransform:"uppercase", margin:"0 0 2px" }}>트렌드 상세 분석</p>
                <p style={{ fontSize:"15px", fontWeight:700, color:"#111", margin:0 }}>{trendModalKw}</p>
              </div>
              <button onClick={()=>setShowTrendModal(false)} style={{ width:"32px", height:"32px", background:"#f1f5f9", border:"none", borderRadius:"8px", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>✕</button>
            </div>
            <div style={{ padding:"24px" }}>
              <TrendTab initialKeyword={trendModalKw} />
            </div>
          </div>
        </div>
      )}

      {/* ③ 상품명 최적화 모달 */}
      {showSeoModal&&(
        <div
          style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setShowSeoModal(false)}
        >
          <div
            style={{ background:"#fff", borderRadius:"14px", width:"min(900px,95vw)", maxHeight:"88vh", overflow:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.18)" }}
            onClick={e=>e.stopPropagation()}
          >
            <div style={{ padding:"16px 24px", borderBottom:"1px solid #e8eaed", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"#fff", zIndex:1 }}>
              <div>
                <p style={{ fontSize:"11px", fontWeight:600, color:PINK.main, letterSpacing:"0.06em", textTransform:"uppercase", margin:"0 0 2px" }}>상품명 최적화</p>
                <p style={{ fontSize:"15px", fontWeight:700, color:"#111", margin:0 }}>{seoModalKw.length>50?seoModalKw.slice(0,50)+"…":seoModalKw}</p>
              </div>
              <button onClick={()=>setShowSeoModal(false)} style={{ width:"32px", height:"32px", background:"#f1f5f9", border:"none", borderRadius:"8px", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>✕</button>
            </div>
            <div style={{ padding:"24px" }}>
              <SeoTab initialKeyword={seoModalKw}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
