const roles = {
  "primary-master": { icon:"PM", title:"Primary Master", subtitle:"Owns the production", reports:"Production company / artist management", goal:"Build, approve and publish one trusted version of the show.", owns:["Project structure and access", "Master Timeline and LTC policy", "Final review, freeze and publishing"], handoff:"Invites the Co-Master and Department Leads, then publishes approved work to the connected team.", connections:["Co-Master", "6 Department Leads", "Viewer / Management", "External recipients"] },
  "co-master": { icon:"CM", title:"Co-Master", subtitle:"Shares project control", reports:"Primary Master", goal:"Keep the production moving when decisions and reviews need a second owner.", owns:["Shared timeline preparation", "Department review and issue resolution", "Publishing when authorised"], handoff:"Receives authority from the Primary Master and returns reviewed department work for final approval.", connections:["Primary Master", "Department Leads"] },
  playback: { icon:"PB", title:"Playback Lead", subtitle:"LTC & reference media", reports:"Primary Master / Co-Master", goal:"Deliver verified, frame-accurate playback material for every song.", owns:["Reference audio", "LTC generation and verification", "Playback files and song alignment"], handoff:"Submits verified media and LTC to the Masters; assigns preparation work to Playback members.", connections:["Masters", "Playback members"] },
  lighting: { icon:"LX", title:"Lighting Lead", subtitle:"Fixtures & looks", reports:"Primary Master / Co-Master", goal:"Translate the show into approved lighting cues mapped to the stage twin.", owns:["Lighting system profile", "Looks, fixtures and effect blueprints", "Lighting cue and file submissions"], handoff:"Collects member work, submits the department package, and responds to Master review.", connections:["Masters", "Lighting members"] },
  video: { icon:"VX", title:"Video Lead", subtitle:"Screens & content", reports:"Primary Master / Co-Master", goal:"Align screen content and video cues with the Master Timeline.", owns:["LED surfaces and formats", "Media and playback requirements", "Video cue submissions"], handoff:"Submits versioned media and cue mappings for approval.", connections:["Masters", "Video members"] },
  sfx: { icon:"FX", title:"SFX Lead", subtitle:"Flames, CO₂ & effects", reports:"Primary Master / Co-Master", goal:"Plan safe, clearly mapped special effects at exact moments in the show.", owns:["SFX devices and positions", "Effect blueprints and parameters", "Safety notes and approvals"], handoff:"Submits cue plans and supporting files; approved cues appear in the published pack.", connections:["Masters", "SFX members"] },
  audio: { icon:"AU", title:"Audio Lead", subtitle:"FOH & monitor systems", reports:"Primary Master / Co-Master", goal:"Keep audio systems, zones and show requirements connected to the script.", owns:["FOH and monitor profiles", "Audio cues and reference files", "Department review"], handoff:"Consolidates team submissions before Master approval.", connections:["Masters", "Audio members"] },
  stage: { icon:"SM", title:"Stage Management Lead", subtitle:"Calls & stage movement", reports:"Primary Master / Co-Master", goal:"Make every planned call and movement readable in show order.", owns:["Show calls and movement notes", "Stage zones and responsibilities", "Running-script readiness"], handoff:"Coordinates cross-department calls and submits the running script for approval.", connections:["Masters", "Stage team", "All Department Leads"] },
  members: { icon:"TM", title:"Department Members", subtitle:"Complete assigned work", reports:"Their Department Lead", goal:"Complete the specific cue, file or acknowledgement requested by their lead.", owns:["Assigned cue details", "Requested uploads", "Comments, submission and acknowledgement"], handoff:"Submit work to one Department Lead, who reviews it before it reaches the Masters.", connections:["Their Department Lead", "Assigned collaborators"] },
  viewer: { icon:"VW", title:"Viewer / Management", subtitle:"Reviews the show", reports:"Not an operational reporting role", goal:"Understand and review the current show without editing complexity.", owns:["Review comments", "Approval when authorised", "Visibility of major show moments"], handoff:"Receives a review request and returns a decision or focused feedback.", connections:["Primary Master", "Co-Master"] },
  recipient: { icon:"EX", title:"External Pack Recipient", subtitle:"Receives published work", reports:"External to the project team", goal:"Open the correct published material and confirm it was received.", owns:["Pack download", "Receipt acknowledgement", "Problem reporting"], handoff:"Receives a signed, versioned pack from the Master and confirms receipt.", connections:["Publishing Master", "Their department pack"] }
};

const edgeGroups = {
  report: [["co-master","primary-master"],["playback","primary-master"],["lighting","primary-master"],["video","primary-master"],["sfx","primary-master"],["audio","primary-master"],["stage","primary-master"],["members","lighting"]],
  invite: [["primary-master","co-master"],["primary-master","playback"],["primary-master","lighting"],["primary-master","video"],["primary-master","sfx"],["primary-master","audio"],["primary-master","stage"],["lighting","members"]],
  work: [["members","lighting"],["playback","co-master"],["lighting","co-master"],["video","co-master"],["sfx","co-master"],["audio","co-master"],["stage","co-master"]],
  approval: [["co-master","primary-master"],["primary-master","viewer"],["primary-master","recipient"]]
};

let visibleFlows = new Set(Object.keys(edgeGroups));
const canvas = document.getElementById("flow-canvas");
const svg = document.getElementById("flow-lines");

function card(id) { return document.querySelector(`[data-role="${id}"]`); }
function point(el, side, box) { const r=el.getBoundingClientRect(); return { x:r.left-box.left+r.width/2, y:(side==="top"?r.top:r.bottom)-box.top }; }
function curve(a,b,kind) {
  const bend = Math.max(28, Math.abs(b.y-a.y)*.42);
  const color={report:"#667085",invite:"#00e5ff",work:"#9b6cff",approval:"#ff2d96"}[kind];
  const dash=kind==="invite"?"6 7":kind==="report"?"2 6":"";
  return `<path class="flow-edge edge-${kind}" d="M ${a.x} ${a.y} C ${a.x} ${a.y+bend}, ${b.x} ${b.y-bend}, ${b.x} ${b.y}" stroke="${color}" ${dash?`stroke-dasharray="${dash}"`:""}/>`;
}
function drawEdges() {
  const box=canvas.getBoundingClientRect(); svg.setAttribute("viewBox",`0 0 ${box.width} ${box.height}`);
  let html="";
  for (const [kind,edges] of Object.entries(edgeGroups)) if(visibleFlows.has(kind)) {
    for(const [from,to] of edges) {
      const aEl=card(from), bEl=card(to); if(!aEl||!bEl) continue;
      const downward=aEl.getBoundingClientRect().top < bEl.getBoundingClientRect().top;
      html += curve(point(aEl,downward?"bottom":"top",box),point(bEl,downward?"top":"bottom",box),kind);
    }
  }
  svg.innerHTML=html;
}
function selectRole(id) {
  const r=roles[id]; if(!r) return;
  document.querySelectorAll(".person-card").forEach(x=>x.classList.toggle("selected",x.dataset.role===id));
  document.getElementById("detail-icon").textContent=r.icon;
  document.getElementById("detail-title").textContent=r.title;
  document.getElementById("detail-subtitle").textContent=r.subtitle;
  document.getElementById("detail-reports").textContent=r.reports;
  document.getElementById("detail-goal").textContent=r.goal;
  document.getElementById("detail-owns").innerHTML=r.owns.map(x=>`<li>${x}</li>`).join("");
  document.getElementById("detail-handoff").textContent=r.handoff;
  document.getElementById("detail-connections").innerHTML=r.connections.map(x=>`<span>${x}</span>`).join("");
}
document.querySelectorAll(".person-card").forEach(el=>el.addEventListener("click",()=>selectRole(el.dataset.role)));
document.querySelectorAll(".legend-toggle").forEach(el=>el.addEventListener("click",()=>{ const key=el.dataset.flow; visibleFlows.has(key)?visibleFlows.delete(key):visibleFlows.add(key); el.classList.toggle("active",visibleFlows.has(key)); drawEdges(); }));
new ResizeObserver(drawEdges).observe(canvas);
window.addEventListener("load",drawEdges);
selectRole("primary-master");
