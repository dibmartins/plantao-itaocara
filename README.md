# Farmácia de plantão em Itaocara

Página que mostra quais farmácias estão de plantão hoje em Itaocara, RJ, com a escala de fins de semana e feriados.

Site: https://itaocara.qualfarmacia.com.br/ (o endereço antigo, dibmartins.github.io/plantao-itaocara, redireciona para ele)

## Atualizar a escala

Tudo fica em `index.html`, dentro do `<script>`:

- `ESCALA`: uma linha por plantão, com as datas (`AAAA-MM-DD`), as duas farmácias e, se houver, o motivo (`selo`).
- `CONTATOS`: endereço e telefone de cada farmácia.

Quando trocar a escala ou os contatos, rode `node ferramentas/gerar-agenda.mjs`. Ele atualiza `plantao.ics` (a agenda que as pessoas assinam pelo botão "Receber aviso na agenda"), `llms.txt` (resumo em texto para assistentes de IA) e os dados estruturados das farmácias no `index.html`; o GitHub avisa se algum ficar desatualizado e mude também `CACHE` em `sw.js` (por exemplo `plantao-v2`) para quem instalou a página receber a versão nova.

Regra do plantão: cada dupla atende o dia todo nas datas da escala (fim de semana ou feriado) e, nos dias úteis seguintes, das 18h às 21h, até o próximo plantão. A agenda (`plantao.ics`) também traz esses dias, sem alarme.

Para ver a página como se fosse outro dia e hora, abra o link com `?data=2026-10-20&hora=19:00` (ou só `#2026-10-24` no fim).

## Busca no Google

- `robots.txt` libera o site para buscadores e IAs e aponta o `sitemap.xml`.
- `sitemap.xml` tem só a página inicial: as telas com `#` não são endereços separados para o Google.
- `compartilhar.png` é a imagem que aparece ao compartilhar o link (WhatsApp, Facebook).
- A fonte Roboto Flex fica em `fontes/`, servida pelo próprio site.
