<script setup lang="ts">
import { computed, ref } from "vue";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Ban, CirclePlay, Pause, TimerOff } from "lucide-vue-next";
import GsBadge from "@/components/ui/GsBadge.vue";
import GsButton from "@/components/ui/GsButton.vue";
import GsCard from "@/components/ui/GsCard.vue";
import GsConfirmacao from "@/components/ui/GsConfirmacao.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsMenuDeAcoes, { type ItemDeMenu } from "@/components/ui/GsMenuDeAcoes.vue";
import GsModal from "@/components/ui/GsModal.vue";
import GsSelect from "@/components/ui/GsSelect.vue";
import GsTable from "@/components/ui/GsTable.vue";
import { listar, type Registro } from "@/api/lista";
import { executar, postarComConsulta } from "@/api/recurso";
import { useSessao } from "@/auth/sessao";
import { useAvisos } from "@/lib/avisos";
import { dataCurta } from "@/lib/formato";
import { opcoesDe, rotuloDe } from "@/lib/opcoes";
import type { BadgeTone, Coluna } from "@/types";

const SITUACAO = {
  PROVISIONING: "Provisionando",
  TRIAL: "Em teste",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  CANCELLED: "Cancelado",
  PURGED: "Expurgado",
};

const TOM: Record<string, BadgeTone> = {
  PROVISIONING: "info",
  TRIAL: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  CANCELLED: "neutral",
  PURGED: "neutral",
};

const sessao = useSessao();
const avisos = useAvisos();
const clienteDeConsulta = useQueryClient();

const situacao = ref<string | number | null>(null);
const pendentes = ref(false);
const suspendendo = ref<Registro | null>(null);
const motivo = ref("");
const confirmando = ref<{ registro: Registro; chave: string; rotulo: string; texto: string } | null>(
  null,
);

const podePlataforma = computed(() => sessao.papeis.includes("PLATFORM_ADMIN"));

const consulta = useQuery({
  queryKey: computed(() => ["plataforma", situacao.value, pendentes.value]),
  enabled: podePlataforma,
  placeholderData: keepPreviousData,
  queryFn: () =>
    pendentes.value
      ? listar("/platform/tenants/pending-provisioning", { page: 0, size: 100 })
      : listar("/platform/tenants", {
          page: 0,
          size: 100,
          ...(situacao.value ? { status: situacao.value } : {}),
        }),
});

const linhas = computed<Registro[]>(() => consulta.data.value?.content ?? []);

function invalidar(): void {
  void clienteDeConsulta.invalidateQueries({ queryKey: ["plataforma"] });
}

const acao = useMutation({
  mutationFn: ({ slug, chave, metodo }: { slug: string; chave: string; metodo: "POST" | "PUT" }) =>
    executar("/platform/tenants", slug, chave, metodo, "slug"),
  onSuccess: () => {
    invalidar();
    avisos.sucesso("Cliente atualizado.");
    confirmando.value = null;
  },
  onError: (e: unknown) => {
    avisos.falha(e instanceof Error ? e.message : String(e));
    confirmando.value = null;
  },
});

const suspender = useMutation({
  mutationFn: (slug: string) =>
    postarComConsulta(
      `/platform/tenants/${slug}/suspend`,
      motivo.value ? { reason: motivo.value } : {},
      "PUT",
    ),
  onSuccess: () => {
    invalidar();
    avisos.sucesso("Cliente suspenso.");
    suspendendo.value = null;
    motivo.value = "";
  },
  onError: (e: unknown) => avisos.falha(e instanceof Error ? e.message : String(e)),
});

const vencerTestes = useMutation({
  mutationFn: () => postarComConsulta("/platform/tenants/expire-trials", {}),
  onSuccess: () => {
    invalidar();
    avisos.sucesso("Testes vencidos processados.");
  },
  onError: (e: unknown) => avisos.falha(e instanceof Error ? e.message : String(e)),
});

function itens(registro: Registro): ItemDeMenu[] {
  const status = String(registro.status ?? "");
  return [
    {
      chave: "activate",
      rotulo: "Tornar pagante",
      icone: CirclePlay,
      desabilitado: status === "ACTIVE" || status === "PURGED",
      motivo: "Já está ativo.",
    },
    {
      chave: "suspend",
      rotulo: "Suspender",
      icone: Pause,
      desabilitado: status === "SUSPENDED" || status === "PURGED",
      motivo: "Já está suspenso.",
    },
    {
      chave: "resume-provisioning",
      rotulo: "Retomar provisionamento",
      icone: CirclePlay,
      desabilitado: status !== "PROVISIONING",
      motivo: "Só cliente que parou provisionando.",
    },
    {
      chave: "cancel",
      rotulo: "Cancelar cliente",
      icone: Ban,
      perigo: true,
      desabilitado: status === "CANCELLED" || status === "PURGED",
      motivo: "Já está cancelado.",
    },
  ];
}

function escolher(chave: string, registro: Registro): void {
  if (chave === "suspend") {
    suspendendo.value = registro;
    return;
  }

  const textos: Record<string, string> = {
    activate: "Tornar este cliente pagante encerra o período de teste.",
    cancel: "Cancelar interrompe o acesso do cliente. O expurgo vem depois do período de carência.",
    "resume-provisioning": "Retomar segue o provisionamento de onde ele parou.",
  };

  const rotulos: Record<string, string> = {
    activate: "Tornar pagante",
    cancel: "Cancelar cliente",
    "resume-provisioning": "Retomar provisionamento",
  };

  confirmando.value = {
    registro,
    chave,
    rotulo: rotulos[chave] ?? chave,
    texto: textos[chave] ?? "",
  };
}

function confirmar(): void {
  const pendente = confirmando.value;
  if (!pendente) return;

  acao.mutate({
    slug: String(pendente.registro.slug),
    chave: pendente.chave,
    metodo: pendente.chave === "resume-provisioning" ? "POST" : "PUT",
  });
}

const colunas: Coluna[] = [
  { key: "slug", label: "Endereço" },
  { key: "name", label: "Nome" },
  { key: "status", label: "Situação" },
  { key: "trialEndsAt", label: "Teste até" },
  { key: "createdAt", label: "Criado em" },
  { key: "acoes", label: "" },
];
</script>

<template>
  <div class="flex flex-col gap-4">
    <GsCard v-if="!podePlataforma">
      <p class="text-body text-ink-soft">
        Esta tela é do administrador da plataforma. Seu token não tem o papel
        <span class="font-medium text-ink">PLATFORM_ADMIN</span>.
      </p>
    </GsCard>

    <template v-else>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-wrap items-end gap-3">
          <GsSelect
            v-model="situacao"
            label="Situação"
            placeholder="Todas"
            :options="opcoesDe(SITUACAO)"
            :disabled="pendentes"
            class="w-56"
          />
          <GsButton
            :variant="pendentes ? 'primary' : 'secondary'"
            @click="pendentes = !pendentes"
          >
            Provisionamentos parados
          </GsButton>
        </div>

        <GsButton
          variant="secondary"
          :disabled="vencerTestes.isPending.value"
          @click="vencerTestes.mutate()"
        >
          <TimerOff class="size-4" />
          Vencer testes esgotados
        </GsButton>
      </div>

      <GsCard flush>
        <GsTable
          :colunas="colunas"
          :linhas="linhas"
          :carregando="consulta.isPending.value"
          :erro="consulta.isError.value ? String(consulta.error.value?.message) : undefined"
          :esqueletos="6"
          vazio-texto="Nenhum cliente nesta situação."
        >
          <template #linha="{ item }">
            <td class="px-6 py-3.5 font-medium whitespace-nowrap text-ink">{{ item.slug }}</td>
            <td class="px-6 py-3.5 text-ink">{{ item.name ?? "—" }}</td>
            <td class="px-6 py-3.5">
              <GsBadge :tone="TOM[String(item.status)] ?? 'neutral'">
                {{ rotuloDe(SITUACAO, item.status) }}
              </GsBadge>
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap text-ink-soft">
              {{ dataCurta(item.trialEndsAt) }}
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap text-ink-soft">
              {{ dataCurta(item.createdAt) }}
            </td>
            <td class="px-4 py-2">
              <GsMenuDeAcoes :itens="itens(item)" @escolher="escolher($event, item)" />
            </td>
          </template>
        </GsTable>
      </GsCard>
    </template>

    <GsModal
      v-if="suspendendo"
      titulo="Suspender cliente"
      :subtitulo="String(suspendendo.slug)"
      largura="media"
      @fechar="suspendendo = null"
    >
      <div class="flex flex-col gap-3">
        <p class="text-body text-ink-soft">
          Suspender libera leitura e bloqueia escrita — a API passa a responder 402 nas gravações.
        </p>
        <GsInput v-model="motivo" label="Motivo" placeholder="Inadimplência" />
      </div>

      <template #rodape>
        <GsButton variant="secondary" @click="suspendendo = null">Cancelar</GsButton>
        <GsButton
          variant="danger"
          :disabled="suspender.isPending.value"
          @click="suspender.mutate(String(suspendendo.slug))"
        >
          {{ suspender.isPending.value ? "Suspendendo..." : "Suspender" }}
        </GsButton>
      </template>
    </GsModal>

    <GsConfirmacao
      v-if="confirmando"
      :titulo="confirmando.rotulo"
      :mensagem="`${confirmando.texto} Cliente: ${confirmando.registro.slug}.`"
      :rotulo-confirmar="confirmando.rotulo"
      :perigo="confirmando.chave === 'cancel'"
      :ocupado="acao.isPending.value"
      @confirmar="confirmar"
      @fechar="confirmando = null"
    />
  </div>
</template>
