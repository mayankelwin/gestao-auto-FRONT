# gestao-safra/front

## Agent skills

### Issue tracker

Issues live as GitLab issues on `gitlab.digitalventura.com.br` (project `erp/gestao-safra/front`), driven by the `glab` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label named after its role (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Mensagens ao usuário

Erros, recusas, alertas, ajuda e feedback de cadastro passam pelo catálogo em `src/lib/mensagens.ts`
e pelos componentes `GsAvisos` / `GsAlerta` / `GsDialogoDeMensagem` — nunca por string solta no
componente. As mensagens variam conforme o papel de quem está logado e carregam para onde ir para
corrigir. See `docs/agents/mensagens.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
