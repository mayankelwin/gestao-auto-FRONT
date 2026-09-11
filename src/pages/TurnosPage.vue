<script setup lang="ts">
import { computed, ref } from "vue";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Ban, DoorOpen, Lock } from "lucide-vue-next";
import GsBadge from "@/components/ui/GsBadge.vue";
import GsButton from "@/components/ui/GsButton.vue";
import GsCard from "@/components/ui/GsCard.vue";
import GsIconButton from "@/components/ui/GsIconButton.vue";
import GsPagination from "@/components/ui/GsPagination.vue";
import GsTable from "@/components/ui/GsTable.vue";
import AberturaDeTurno from "@/components/balcao/AberturaDeTurno.vue";
import CancelamentoDeTurno from "@/components/balcao/CancelamentoDeTurno.vue";
import FechamentoDeTurno from "@/components/balcao/FechamentoDeTurno.vue";
import { listar, type Registro } from "@/api/lista";
import { EXIGE_EMPRESA, useEmpresa } from "@/auth/empresa";
import { useTenant } from "@/auth/tenant";
import { useAvisos } from "@/lib/avisos";
import { dataCurta, dinheiro } from "@/lib/formato";
import { rotuloDe, SITUACAO_DO_TURNO } from "@/lib/opcoes";
import type { BadgeTone, Coluna } from "@/types";

const TAMANHO = 20;

const TOM_DA_SITUACAO: Record<string, BadgeTone> = {
  OPEN: "info",
  CLOSED: "success",
  CANCELLED: "neutral",
};

const COLUNAS: Coluna[] = [
  { key: "number", label: "Turno" },
  { key: "posProfileName", label: "Caixa" },
  { key: "cashier", label: "Operador" },
  { key: "postingDate", label: "Data" },
  { key: "totalSales", label: "Vendas", align: "right" },
  { key: "totalDifference", label: "Diferença", align: "right" },
  { key: "status", label: "Situação" },
  { key: "acoes", label: "" },
];

const empresa = useEmpresa();
const tenant = useTenant();
const avisos = useAvisos();
const clienteDeConsulta = useQueryClient();

const pagina = ref(0);
const abrindo = ref(false);
const fechando = ref<Registro | null>(null);
const cancelando = ref<Registro | null>(null);

const semEmpresa = computed(() => empresa.atualId === null);

const consulta = useQuery({
  queryKey: computed(() => ["turnos", tenant.atual, empresa.atualId, pagina.value]),
  enabled: computed(() => empresa.atualId !== null),
  placeholderData: keepPreviousData,
  queryFn: () =>
    listar("/pos/shifts", { page: pagina.value, size: TAMANHO, companyId: empresa.atualId }),
});

const turnos = computed<Registro[]>(() => consulta.data.value?.content ?? []);
const metadados = computed(() => consulta.data.value?.page);

const erro = computed(() => {
  if (semEmpresa.value) return EXIGE_EMPRESA;
  return consulta.isError.value ? String(consulta.error.value?.message) : undefined;
});

function atualizar(mensagem: string): void {
  abrindo.value = false;
  fechando.value = null;
  cancelando.value = null;
  avisos.sucesso(mensagem);
  void clienteDeConsulta.invalidateQueries({ queryKey: ["turnos"] });
  void clienteDeConsulta.invalidateQueries({ queryKey: ["turno-aberto"] });
}

function diferenca(turno: Registro): number {
  return Number(turno.totalDifference ?? 0);
}
</script>

<template>
  <div class="flex flex-col gap-4 mt-4">
    <div class="flex justify-end">
      <GsButton :disabled="semEmpresa" @click="abrindo = true">
        <DoorOpen class="size-4" />
        Abrir turno
      </GsButton>
    </div>

    <GsCard flush>
      <GsTable
        :colunas="COLUNAS"
        :linhas="turnos"
        :carregando="consulta.isPending.value && !semEmpresa"
        :erro="erro"
        :esqueletos="6"
        vazio-texto="Nenhum turno ainda. Abra o primeiro para poder vender no balcão."
      >
        <template #linha="{ item }">
          <td class="px-6 py-3.5 font-medium text-ink">{{ item.number }}</td>
          <td class="px-6 py-3.5 text-ink-soft">{{ item.posProfileName }}</td>
          <td class="px-6 py-3.5 text-ink-soft">{{ item.cashier || "—" }}</td>
          <td class="px-6 py-3.5 whitespace-nowrap text-ink-soft">
            {{ dataCurta(item.postingDate) }}
          </td>
          <td class="px-6 py-3.5 text-right tabular-nums text-ink">
            {{ dinheiro(item.totalSales ?? 0) }}
          </td>
          <td
            class="px-6 py-3.5 text-right tabular-nums"
            :class="diferenca(item) === 0 ? 'text-ink-mute' : 'text-danger'"
          >
            {{ dinheiro(diferenca(item)) }}
          </td>
          <td class="px-6 py-3.5">
            <GsBadge :tone="TOM_DA_SITUACAO[String(item.status ?? '')] ?? 'neutral'">
              {{ rotuloDe(SITUACAO_DO_TURNO, item.status) }}
            </GsBadge>
          </td>
          <td class="px-6 py-3.5">
            <div v-if="item.status === 'OPEN'" class="flex items-center justify-end gap-1">
              <button
                type="button"
                class="inline-flex cursor-pointer items-center gap-1.5 rounded-control px-2 py-1 text-body font-medium text-primary transition-colors hover:bg-primary-50"
                @click="fechando = item"
              >
                <Lock class="size-4" />
                Fechar
              </button>
              <GsIconButton
                tone="danger"
                label="Cancelar turno aberto por engano"
                title="Cancelar turno aberto por engano"
                @click="cancelando = item"
              >
                <Ban class="size-4" />
              </GsIconButton>
            </div>
          </td>
        </template>
      </GsTable>

      <GsPagination
        v-if="metadados"
        :pagina="Number(metadados.number ?? 0)"
        :total-paginas="Number(metadados.totalPages ?? 0)"
        :total-elementos="Number(metadados.totalElements ?? 0)"
        :tamanho="TAMANHO"
        @mudar="pagina = $event"
      />
    </GsCard>

    <AberturaDeTurno
      v-if="abrindo"
      @fechar="abrindo = false"
      @aberto="atualizar('Turno aberto.')"
    />

    <FechamentoDeTurno
      v-if="fechando"
      :turno="fechando"
      @fechar="fechando = null"
      @fechado="atualizar('Turno fechado.')"
    />

    <CancelamentoDeTurno
      v-if="cancelando"
      :turno="cancelando"
      @fechar="cancelando = null"
      @cancelado="atualizar('Turno cancelado.')"
    />
  </div>
</template>
