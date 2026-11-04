// Gera, a partir da ESCALA e dos CONTATOS do index.html:
// - plantao.ics (a agenda assinável);
// - llms.txt (resumo em texto para assistentes de IA);
// - os dados estruturados (JSON-LD) das farmácias dentro do index.html.
// Rode depois de mudar a escala ou os contatos: node ferramentas/gerar-agenda.mjs
// Com --conferir, só avisa (e sai com erro) se algum deles estiver desatualizado.
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

// llms.txt: o mesmo conteúdo do site em texto simples, porque a maioria dos robôs de IA não executa JavaScript.
const dataBR = d => d.split("-").reverse().join("/");
const semana = d => ["domingo","segunda","terça","quarta","quinta","sexta","sábado"][new Date(d + "T12:00:00Z").getUTCDay()];
const contato = n => {
  const c = CONTATOS[n] || {};
  return [c.end, c.tel && `tel. ${c.tel}`, c.zap && `WhatsApp ${c.zap}`].filter(Boolean).join(", ") || "sem contato cadastrado";
};
const llms = [
  "# Farmácias Itaocara",
  "",
  "> Farmácia de plantão hoje em Itaocara-RJ: a escala de plantão das farmácias nos fins de semana e feriados e o telefone, WhatsApp e endereço de todas as farmácias da cidade.",
  "",
  "Regra do plantão: em cada data da escala (fim de semana ou feriado), as duas farmácias listadas atendem o dia todo. Nos dias úteis seguintes, a mesma dupla atende das 18h às 21h, até o próximo plantão. Fora disso, as farmácias funcionam no horário comercial de cada uma.",
  "",
  "A escala vem do cartaz de plantão das farmácias de Itaocara. Confirme por telefone antes de ir, principalmente em feriados.",
  "",
  "## Páginas",
  "",
  `- [Plantão de hoje](${SITE}): quais farmácias estão de plantão agora`,
  `- [Escala de plantão](${SITE}#escala): todas as datas`,
  `- [Farmácias](${SITE}#farmacias): telefones, WhatsApp e endereços`,
  `- [Telefones de emergência](${SITE}#emergencia)`,
  `- [Agenda da escala (.ics)](${SITE}plantao.ics)`,
  "",
  "## Escala de plantão",
  "",
  ...ESCALA.map(e => `- ${e.d.map(d => `${semana(d)} ${dataBR(d)}`).join(" e ")}${e.selo ? ` (${e.selo})` : ""}: ${e.f.join(" e ")}`),
  "",
  "## Farmácias de Itaocara",
  "",
  ...Object.keys(CONTATOS).sort((a, b) => a.localeCompare(b, "pt-BR")).map(n => `- ${n}: ${contato(n)}`),
  ""
].join("\n");

// Dados estruturados: o site e cada farmácia como Pharmacy, para o Google e as IAs ligarem o site às farmácias da cidade.
const farmacias = Object.entries(CONTATOS).map(([nome, c]) => ({
  "@type": "Pharmacy",
  name: nome,
  ...(c.tel || c.zap ? {telephone: c.tel || c.zap} : {}),
  address: {"@type": "PostalAddress", ...(c.end ? {streetAddress: c.end} : {}), addressLocality: "Itaocara", addressRegion: "RJ", addressCountry: "BR"},
  ...(c.geo ? {geo: {"@type": "GeoCoordinates", latitude: c.geo[0], longitude: c.geo[1]}} : {})
}));
const jsonld = {
  "@context": "https://schema.org",
  "@graph": [
    {"@type": "WebSite", "@id": SITE + "#site", url: SITE, name: "Farmácias Itaocara", inLanguage: "pt-BR",
     description: "Farmácia de plantão hoje em Itaocara-RJ, escala de plantão e contatos das farmácias."},
    {"@type": "ItemList", name: "Farmácias de Itaocara", itemListElement: farmacias.map((f, i) => ({"@type": "ListItem", position: i + 1, item: f}))}
  ]
};
const INICIO = "<!-- dados-estruturados: gerado por ferramentas/gerar-agenda.mjs, não edite à mão -->", FIM = "<!-- /dados-estruturados -->";
const a = html.indexOf(INICIO), b = html.indexOf(FIM);
if(a < 0 || b < a) throw new Error("marcadores dos dados estruturados não encontrados no index.html");
const htmlNovo = html.slice(0, a + INICIO.length) + "\n<script type=\"application/ld+json\">" + JSON.stringify(jsonld).replaceAll("<", "\\u003c") + "</script>\n" + html.slice(b);

const saidas = [["plantao.ics", ics], ["llms.txt", llms], ["index.html", htmlNovo]];
if(process.argv.includes("--conferir")){
  const velhos = saidas.filter(([nome, conteudo]) => { try { return readFileSync(new URL(nome, raiz), "utf8") !== conteudo; } catch { return true; } }).map(([nome]) => nome);
  if(velhos.length){ console.error(`Desatualizado: ${velhos.join(", ")}. Rode node ferramentas/gerar-agenda.mjs`); process.exit(1); }
  console.log("plantao.ics, llms.txt e dados estruturados em dia");
} else {
  for(const [nome, conteudo] of saidas) writeFileSync(new URL(nome, raiz), conteudo);
  console.log(`Gerados plantao.ics (${ESCALA.length} plantões), llms.txt e dados estruturados (${farmacias.length} farmácias)`);
}
