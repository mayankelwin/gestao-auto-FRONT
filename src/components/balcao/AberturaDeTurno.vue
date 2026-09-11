<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { TriangleAlert } from "lucide-vue-next";
import GsButton from "@/components/ui/GsButton.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsModal from "@/components/ui/GsModal.vue";
import GsSelect from "@/components/ui/GsSelect.vue";
import GsTextarea from "@/components/ui/GsTextarea.vue";
import { abrirTurno, buscarCaixas } from "@/api/balcao";
import { listar, type Registro } from "@/api/lista";
import { useEmpresa } from "@/auth/empresa";
import { useTenant } from "@/auth/tenant";
import { hoje } from "@/lib/formato";

const emit = defineEmits<{ (e: "fechar"): void; (e: "aberto"): void }>();

const empresa = useEmpresa();
const tenant = useTenant();

const caixaSelecionado = ref<string | number | null>(null);
const data = ref(hoje());
const observacoes = ref("");
const saldos = ref<Record<number, string>>({});
const falha = ref<string | null>(null);

const caixas = useQuery({
  queryKey: computed(() => ["caixas", tenant.atual, empresa.atualId]),
  enabled: computed(() => empresa.atualId !== null),
  queryFn: () => buscarCaixas(empresa.atualId!),
});

const opcoesDeCaixa = computed(() =>
  (caixas.data.value ?? []).map((c) => ({ value: Number(c.id), label: String(c.name) })),
);

watch(opcoesDeCaixa, (lista) => {
  if (caixaSelecionado.value === null && lista.length > 0) caixaSelecionado.value = lista[0].value;
});

const caixa = computed(() =>
  (caixas.data.value ?? []).find((c) => Number(c.id) === Number(caixaSelecionado.value)),
);

const meios = useQuery({
  queryKey: computed(() => ["meios-de-pagamento", tenant.atual]),
  queryFn: () => listar("/payment-methods", { page: 0, size: 100 }),
});

const aceitos = computed(() => {
  const doCaixa = caixa.value?.payments ?? [];
  const todos = (meios.data.value?.content ?? []) as Registro[];

  return doCaixa.map((p) => {
    const meio = todos.find((m) => Number(m.id) === Number(p.paymentMethodId));
    return {
      id: Number(p.paymentMethodId),
      nome: String(p.paymentMethodName ?? meio?.name ?? p.paymentMethodId),
      dinheiro: p.kind === "CASH",
    };
  });
});

const abrir = useMutation({
  mutationFn: () =>
    abrirTurno({
      posProfileId: Number(caixaSelecionado.value),
      postingDate: data.value || undefined,
      remarks: observacoes.value || undefined,
      openingBalances: aceitos.value
        .map((m) => ({ paymentMethodId: m.id, amount: Number(saldos.value[m.id] ?? 0) }))
        .filter((s) => s.amount !== 0),
    }),
  onSuccess: () => emit("aberto"),
  onError: (erro: unknown) => {
    falha.value = erro instanceof Error ? erro.message : String(erro);
  },
});
</script>

<template>
  <GsModal
    titulo="Abrir turno"
    subtitulo="Um turno aberto por caixa, e um operador em um turno só."
    @fechar="emit('fechar')"
  >
    <div class="flex flex-col gap-5">
      <div
        v-if="falha"
        class="flex items-start gap-2.5 rounded-card border border-danger bg-danger-bg px-4 py-3"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-danger" />
        <p class="text-body text-danger">{{ falha }}</p>
      </div>

      <p v-if="opcoesDeCaixa.length === 0 && !caixas.isPending.value" class="text-body text-ink-soft">
        Nenhum caixa cadastrado nesta empresa. Cadastre um em Balcão / Caixas antes de abrir turno.
      </p>

      <GsSelect
        v-model="caixaSelecionado"
        label="Caixa *"
        :options="opcoesDeCaixa"
        placeholder="Selecione..."
      />

      <GsInput
        v-model="data"
        label="Data de lançamento"
        type="date"
        hint="Em branco, usa hoje."
      />

      <section v-if="aceitos.length > 0" class="flex flex-col gap-3">
        <h3 class="text-overline text-ink-mute uppercase">Fundo de troco</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <GsInput
            v-for="meio in aceitos"
            :key="meio.id"
            v-model="saldos[meio.id]"
            :label="meio.nome"
            type="number"
            placeholder="0,00"
            :hint="meio.dinheiro ? 'O dinheiro que já está na gaveta.' : undefined"
          />
        </div>
      </section>

      <GsTextarea v-model="observacoes" label="Observações" />

      <div class="flex justify-end gap-2">
        <GsButton variant="secondary" @click="emit('fechar')">Cancelar</GsButton>
        <GsButton
          :disabled="caixaSelecionado === null || abrir.isPending.value"
          @click="abrir.mutate()"
        >
          Abrir
        </GsButton>
      </div>
    </div>
  </GsModal>
</template>
