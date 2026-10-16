# Farmácia de plantão em Itaocara

Página que mostra quais farmácias estão de plantão hoje em Itaocara, RJ, com a escala de fins de semana e feriados.

Site: https://dibmartins.github.io/plantao-itaocara/

## Atualizar a escala

Tudo fica em `index.html`, dentro do `<script>`:

- `ESCALA`: uma linha por plantão, com as datas (`AAAA-MM-DD`), as duas farmácias e, se houver, o motivo (`selo`).
- `CONTATOS`: endereço e telefone de cada farmácia.

Quando trocar a escala, mude também `CACHE` em `sw.js` (por exemplo `plantao-v2`) para quem instalou a página receber a versão nova.

Para ver a página como se fosse outro dia, abra o link com `#2026-10-24` no fim.
