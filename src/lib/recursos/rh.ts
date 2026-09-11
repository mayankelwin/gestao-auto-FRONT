import { UserCheck, UserMinus } from "lucide-vue-next";
import type { Registro } from "@/api/lista";
import type { BadgeTone } from "@/types";
import {
  OPCOES_PERFIL_DE_ACESSO,
  PERFIL_DE_ACESSO,
  SITUACAO_DO_USUARIO,
  rotuloDe,
} from "@/lib/opcoes";
import type { Recurso } from "./tipos";

const TOM_DA_SITUACAO: Record<string, BadgeTone> = {
  ACTIVE: "success",
  INVITED: "warning",
  DISABLED: "neutral",
};

function situacaoDoUsuario(registro: Registro): { texto: string; tom: BadgeTone } {
  const situacao = String(registro.status ?? "ACTIVE");

  return {
    texto: rotuloDe(SITUACAO_DO_USUARIO, situacao),
    tom: TOM_DA_SITUACAO[situacao] ?? "neutral",
  };
}

export const rh: Recurso[] = [
  {
    rota: "/usuarios",
    endpoint: "/hr/users",
    temBusca: true,
    buscaPlaceholder: "Nome ou e-mail",
    papeisEscrita: ["TENANT_ADMIN"],
    rotuloNovo: "Novo usuário",
    singular: "usuário",
    rotulo: (r) => String(r.fullName ?? r.email ?? ""),
    colunas: [
      { campo: "fullName", label: "Nome" },
      { campo: "email", label: "E-mail" },
      {
        campo: "profile",
        label: "Perfil",
        valor: (r) => rotuloDe(PERFIL_DE_ACESSO, r.profile),
      },
      { campo: "status", label: "Situação", formato: "situacao", situacao: situacaoDoUsuario },
    ],
    formulario: [
      {
        campos: [
          {
            campo: "fullName",
            label: "Nome completo",
            tipo: "texto",
            obrigatorio: true,
            inteira: true,
          },
          {
            campo: "email",
            label: "E-mail",
            tipo: "email",
            obrigatorio: true,
            inteira: true,
            somenteNaCriacao: true,
            ajuda: "É por ele que a pessoa entra, e é para ele que vai o convite.",
          },
          {
            campo: "profile",
            label: "Perfil de acesso",
            tipo: "opcoes",
            obrigatorio: true,
            opcoes: OPCOES_PERFIL_DE_ACESSO,
            ajuda: "O que a pessoa pode fazer neste cliente. Administrador faz tudo.",
          },
        ],
      },
    ],
    acoes: [
      {
        chave: "activate",
        rotulo: "Reativar acesso",
        icone: UserCheck,
        confirmacao: "A pessoa volta a entrar no sistema com o mesmo e-mail e o mesmo perfil.",
        sucesso: "Acesso reativado.",
        papeis: ["TENANT_ADMIN"],
        disponivel: (r) => r.status === "DISABLED",
        motivo: "Só quem está desativado pode ser reativado.",
      },
      {
        chave: "deactivate",
        rotulo: "Desativar conta",
        icone: UserMinus,
        perigo: true,
        confirmacao:
          "Desativar a conta bloqueia a entrada da pessoa em TODOS os clientes de que ela participa, não só neste. Para tirá-la só daqui, use Desligar do cliente.",
        sucesso: "Conta desativada.",
        papeis: ["TENANT_ADMIN"],
        disponivel: (r) => r.status !== "DISABLED",
        motivo: "A conta já está desativada.",
      },
    ],
    exclusao: {
      titulo: "Desligar do cliente",
      mensagem: (rotulo) =>
        `Desligar “${rotulo}” deste cliente? A pessoa perde o acesso aqui e mantém a conta dela — se participar de outro cliente, continua entrando lá normalmente.`,
      rotuloConfirmar: "Desligar do cliente",
      sucesso: "Pessoa desligada do cliente.",
    },
  },
];
