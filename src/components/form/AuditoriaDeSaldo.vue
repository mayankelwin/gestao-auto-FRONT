<script setup lang="ts">
import { computed } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { CircleAlert, CircleCheck, RefreshCw } from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import GsKpiCard from "@/components/ui/GsKpiCard.vue";
import { conferirSaldo } from "@/api/relatorios";
import { postarComConsulta } from "@/api/recurso";
import type { Registro } from "@/api/lista";
import { EXIGE_EMPRESA, useEmpresa } from "@/auth/empresa";
import { useSessao } from "@/auth/sessao";
import { useAvisos } from "@/lib/avisos";
import { numero } from "@/lib/formato";

const props = defineProps<{ registro: Registro }>();

const empresa = useEmpresa();
const sessao = useSessao();
const avisos = useAvisos();
const clienteDeConsulta = useQueryClient();

const itemId = computed(() => Number(props.registro.itemId));
const depositoId = computed(() => Number(props.registro.warehouseId));

const temChaves = computed(() => Number.isFinite(itemId.value) && Number.isFinite(depositoId.value));

const consulta = useQuery({
  queryKey: computed(() => ["bin-audit", empresa.atualId, itemId.value, depositoId.value]),
  enabled: computed(() => empresa.atualId !== null && temChaves.value),
  queryFn: () => conferirSaldo(empresa.atualId!, itemId.value, depositoId.value),
});

const auditoria = computed(() => consulta.data.value);
const confere = computed(() => auditoria.value?.consistent === true);

const diferenca = computed(
  () => Number(auditoria.value?.quantityFromBin ?? 0) - Number(auditoria.value?.quantityFromLedger ?? 0),
);

const refazer = useMutation({
  mutationFn: () =>
    postarComConsulta("/stock/bin-rebuild", {
      companyId: empresa.atualId,
      itemId: itemId.value,
      warehouseId: depositoId.value,
    }),
  onSuccess: () => {
    void clienteDeConsulta.invalidateQueries({ queryKey: ["bin-audit"] });
    void clienteDeConsulta.invalidateQueries({ queryKey: ["lista"] });
    avisos.sucesso("Saldo refeito a partir do razão.");
  },
  onError: (e: unknown) => avisos.falha(e instanceof Error ? e.message : String(e)),
});

const erro = computed(() => {
  if (empresa.atualId === null) return EXIGE_EMPRESA;
  if (!temChaves.value) return "Esta linha não traz item e depósito para conferir.";
  return consulta.isError.value ? String(consulta.error.value?.message) : null;
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-small text-ink-soft">
      O saldo guardado no bin é conferido contra a soma do razão de estoque. Divergência significa
      movimento gravado no razão que não chegou ao saldo.
    </p>

    <p v-if="erro" class="text-body text-danger">{{ erro }}</p>
    <p v-else-if="consulta.isPending.value" class="text-body text-ink-mute">Conferindo...</p>

    <template v-else>
      <div
        class="flex items-start gap-3 rounded-card border px-4 py-3"
        :class="confere ? 'border-success bg-success-bg' : 'border-danger bg-danger-bg'"
      >
        <component
          :is="confere ? CircleCheck : CircleAlert"
          class="mt-0.5 size-5 shrink-0"
          :class="confere ? 'text-success' : 'text-danger'"
        />
        <p class="text-body" :class="confere ? 'text-success' : 'text-danger'">
          {{
            confere
              ? "O saldo confere com o razão."
              : `O saldo diverge do razão em ${numero(diferenca)}.`
          }}
        </p>
      </div>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GsKpiCard label="Saldo guardado" :value="numero(auditoria?.quantityFromBin ?? 0)" note="No bin" />
        <GsKpiCard
          label="Saldo pelo razão"
          :value="numero(auditoria?.quantityFromLedger ?? 0)"
          note="Somando os movimentos"
        />
        <GsKpiCard
          label="Diferença"
          :value="numero(diferenca)"
          :note="confere ? 'Sem divergência' : 'Refazer resolve'"
          :note-tone="confere ? 'success' : 'danger'"
        />
      </section>

      <div v-if="sessao.temPapel('TENANT_ADMIN')" class="flex justify-end">
        <GsButton
          variant="secondary"
          :disabled="refazer.isPending.value"
          @click="refazer.mutate()"
        >
          <RefreshCw class="size-4" />
          {{ refazer.isPending.value ? "Refazendo..." : "Refazer saldo a partir do razão" }}
        </GsButton>
      </div>
    </template>
  </div>
</template>
