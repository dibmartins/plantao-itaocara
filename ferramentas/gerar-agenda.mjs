// Gera plantao.ics (a agenda assinável) a partir da ESCALA e dos CONTATOS do index.html.
// Rode depois de mudar a escala: node ferramentas/gerar-agenda.mjs
// Com --conferir, só avisa (e sai com erro) se o plantao.ics estiver desatualizado.
import {readFileSync, writeFileSync} from "node:fs";

const raiz = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", raiz), "utf8");
const trecho = nome => {
  const m = new RegExp(`const ${nome} = ([\\s\\S]*?\\n[\\]}]);`).exec(html);
  if(!m) throw new Error(`${nome} não encontrado no index.html`);
  return Function(`return ${m[1]}`)();
};
const CONTATOS = trecho("CONTATOS"), ESCALA = trecho("ESCALA");
const SITE = /const SITE = "([^"]+)"/.exec(html)[1];

const semTraco = d => d.replaceAll("-", "");
const diaSeguinte = d => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
const texto = s => s.replace(/[\;,]/g, c => "\\" + c).replace(/\n/g, "\\n");
// Linhas de no máximo 75 bytes, continuadas com espaço (RFC 5545).
function dobrar(linha){
  const partes = []; let atual = "";
  for(const ch of linha){
    if(Buffer.byteLength(atual + ch) > (partes.length ? 74 : 75)){ partes.push(atual); atual = ""; }
    atual += ch;
  }
  partes.push(atual);
  return partes.join("\r\n ");
}

const linhas = [
  "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Farmacias Itaocara//Plantao//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
  "X-WR-CALNAME:Plantão Itaocara", "X-WR-CALDESC:Farmácias de plantão em Itaocara-RJ: o dia todo nos fins de semana e feriados e\, nos dias úteis seguintes\, das 18h às 21h",
  "X-WR-TIMEZONE:America/Sao_Paulo", "REFRESH-INTERVAL;VALUE=DURATION:PT12H", "X-PUBLISHED-TTL:PT12H"
];
const somarDias = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
ESCALA.forEach((e, i) => {
  const inicio = e.d[0], fim = diaSeguinte(e.d.at(-1));
  const quem = e.f.map(n => CONTATOS[n]?.tel ? `${n}: ${CONTATOS[n].tel}` : n).join("\n");
  linhas.push(
    "BEGIN:VEVENT",
    `UID:plantao-${semTraco(inicio)}@farmacias-itaocara`,
    // Data fixa para o arquivo só mudar quando a escala mudar.
    `DTSTAMP:${semTraco(inicio)}T000000Z`,
    `DTSTART;VALUE=DATE:${semTraco(inicio)}`,
    `DTEND;VALUE=DATE:${semTraco(fim)}`,
    `SUMMARY:${texto(`Plantão: ${e.f.join(" e ")}`)}`,
    `DESCRIPTION:${texto(`${e.selo ? e.selo + "\n\n" : ""}${quem}\n\nEscala completa: ${SITE}#escala`)}`,
    `URL:${SITE}`,
    "TRANSP:TRANSPARENT",
    // O evento começa à meia-noite; 7 horas antes é a véspera às 17h (sexta-feira, no caso do fim de semana).
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${texto(`Plantão amanhã: ${e.f.join(" e ")}`)}`, "TRIGGER:-PT7H", "END:VALARM",
    "END:VEVENT"
  );
  // A mesma dupla atende nos dias úteis seguintes, das 18h às 21h, até o próximo plantão (sem alarme, para não avisar todo dia).
  const ate = ESCALA[i + 1]?.d[0] ?? somarDias(e.d.at(-1), 6);
  if(fim < ate) linhas.push(
    "BEGIN:VEVENT",
    `UID:plantao-noite-${semTraco(inicio)}@farmacias-itaocara`,
    `DTSTAMP:${semTraco(inicio)}T000000Z`,
    `DTSTART;VALUE=DATE:${semTraco(fim)}`,
    `DTEND;VALUE=DATE:${semTraco(ate)}`,
    `SUMMARY:${texto(`Plantão das 18h às 21h: ${e.f.join(" e ")}`)}`,
    `DESCRIPTION:${texto(`Nos dias úteis, a dupla do último plantão atende das 18h às 21h.\n\n${quem}\n\nEscala completa: ${SITE}#escala`)}`,
    `URL:${SITE}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT"
  );
});
linhas.push("END:VCALENDAR");
const ics = linhas.map(dobrar).join("\r\n") + "\r\n";

const destino = new URL("plantao.ics", raiz);
if(process.argv.includes("--conferir")){
  let atual = ""; try { atual = readFileSync(destino, "utf8"); } catch {}
  if(atual !== ics){ console.error("plantao.ics desatualizado: rode node ferramentas/gerar-agenda.mjs"); process.exit(1); }
  console.log("plantao.ics em dia");
} else {
  writeFileSync(destino, ics);
  console.log(`plantao.ics gerado com ${ESCALA.length} plantões`);
}
