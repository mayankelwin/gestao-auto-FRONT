<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Plus, Receipt, ShoppingCart, Trash2, TriangleAlert } from "lucide-vue-next";
import GsBadge from "@/components/ui/GsBadge.vue";
import GsButton from "@/components/ui/GsButton.vue";
import GsCard from "@/components/ui/GsCard.vue";
import GsCombo from "@/components/ui/GsCombo.vue";
import GsConfirmacao from "@/components/ui/GsConfirmacao.vue";
import GsIconButton from "@/components/ui/GsIconButton.vue";
import GsInput from "@/components/ui/GsInput.vue";
import GsSelect from "@/components/ui/GsSelect.vue";
import GsTabelaCompacta from "@/components/ui/GsTabelaCompacta.vue";
import GsTextarea from "@/components/ui/GsTextarea.vue";
import AberturaDeTurno from "@/components/balcao/AberturaDeTurno.vue";
import CupomDaVenda from "@/components/balcao/CupomDaVenda.vue";
import SemCaixa from "@/components/balcao/SemCaixa.vue";
import {
  buscarCaixas,
  buscarTurnoAberto,
  resolverPreco,
  venderNoBalcao,
  type CupomDaVenda as Cupom,
} from "@/api/balcao";
import { listar, type Registro } from "@/api/lista";
import { EXIGE_EMPRESA, useEmpresa } from "@/auth/empresa";
import { useTenant } from "@/auth/tenant";
import { gravarCaixa, lerCaixa } from "@/lib/caixaLembrado";
import { dinheiro } from "@/lib/formato";
import { refCliente, refItem } from "@/lib/referencias";
import type { Coluna } from "@/types";

interface ItemDoCarrinho {
  itemId: number;
  rotulo: string;
  quantity: number;
  rate: number;
}

interface PagamentoDaVenda {
  paymentMethodId: number | null;
  amount: string;
}

const ATALHOS = [
  { tecla: "F2", acao: "Buscar produto" },
  { tecla: "F3", acao: "Quantidade" },
  { tecla: "F4", acao: "Preço" },
  { tecla: "Enter", acao: "Adicionar ao carrinho" },
  { tecla: "F6", acao: "Cliente" },
  { tecla: "F7", acao: "Valor do pagamento" },
  { tecla: "F8", acao: "Remover o último item" },
  { tecla: "F9", acao: "Fechar venda" },
  { tecla: "Esc", acao: "Limpar o item em digitação" },
];

const COLUNAS_DO_CARRINHO: Coluna[] = [
  { key: "item", label: "Item" },
  { key: "quantity", label: "Qtd.", align: "right" },
  { key: "rate", label: "Preço", align: "right" },
  { key: "subtotal", label: "Subtotal", align: "right" },
  { key: "acoes", label: "" },
];

const empresa = useEmpresa();
const tenant = useTenant();
const clienteDeConsulta = useQueryClient();

const caixaSelecionado = ref<string | number | null>(null);
const clienteId = ref<number | null>(null);
const observacoes = ref("");
const carrinho = ref<ItemDoCarrinho[]>([]);
const pagamentos = ref<PagamentoDaVenda[]>([{ paymentMethodId: null, amount: "" }]);
const cupom = ref<Cupom | null>(null);
const abrindoTurno = ref(false);
const limpandoCarrinho = ref(false);
const semCaixaDispensado = ref(false);
const falha = ref<string | null>(null);

const itemEmDigitacao = ref<number | string | null>(null);
const rotuloEmDigitacao = ref("");
const quantidade = ref("1");
const preco = ref("");
const precoDaLista = ref<number | null>(null);
const origemDoPreco = ref("");
const buscandoPreco = ref(false);

const campoDeProduto = ref<InstanceType<typeof GsCombo> | null>(null);
const campoDeQuantidade = ref<InstanceType<typeof GsInput> | null>(null);
const campoDePreco = ref<InstanceType<typeof GsInput> | null>(null);
const campoDeCliente = ref<InstanceType<typeof GsCombo> | null>(null);
const camposDeValor = ref<InstanceType<typeof GsInput>[]>([]);

const semEmpresa = computed(() => empresa.atualId === null);

const caixas = useQuery({
  queryKey: computed(() => ["caixas", tenant.atual, empresa.atualId]),
  enabled: computed(() => empresa.atualId !== null),
  queryFn: () => buscarCaixas(empresa.atualId!),
});

const opcoesDeCaixa = computed(() =>
  (caixas.data.value ?? []).map((c) => ({ value: Number(c.id), label: String(c.name) })),
);

const semCaixa = computed(
  () => !semEmpresa.value && !caixas.isPending.value && opcoesDeCaixa.value.length === 0,
);

const avisandoSemCaixa = computed(() => semCaixa.value && !semCaixaDispensado.value);

watch(
  opcoesDeCaixa,
  (lista) => {
    const empresaId = empresa.atualId;
    if (empresaId === null || lista.length === 0) return;

    const atual = caixaSelecionado.value === null ? null : Number(caixaSelecionado.value);
    if (atual !== null && lista.some((c) => c.value === atual)) return;

    const salvo = lerCaixa(empresaId);
    const valido = salvo !== null && lista.some((c) => c.value === salvo);
    caixaSelecionado.value = valido ? salvo : lista[0].value;
  },
  { immediate: true },
);

const caixaId = computed(() =>
  caixaSelecionado.value === null ? null : Number(caixaSelecionado.value),
);

watch(caixaId, (id) => {
  const empresaId = empresa.atualId;
  if (empresaId === null || id === null) return;
  if (!opcoesDeCaixa.value.some((c) => c.value === id)) return;
  gravarCaixa(empresaId, id);
});

const caixa = computed(() => (caixas.data.value ?? []).find((c) => Number(c.id) === caixaId.value));

const listaDePrecoId = computed(() => {
  const id = caixa.value?.priceListId;
  return id === undefined || id === null ? null : Number(id);
});

const turno = useQuery({
  queryKey: computed(() => ["turno-aberto", tenant.atual, caixaId.value]),
  enabled: computed(() => caixaId.value !== null),
  queryFn: () => buscarTurnoAberto(caixaId.value!),
});

const meios = useQuery({
  queryKey: computed(() => ["meios-de-pagamento", tenant.atual]),
  queryFn: () => listar("/payment-methods", { page: 0, size: 100 }),
});

const opcoesDeMeio = computed(() => {
  const doCaixa = caixa.value?.payments ?? [];
  const todos = (meios.data.value?.content ?? []) as Registro[];

  return doCaixa.map((p) => {
    const meio = todos.find((m) => Number(m.id) === Number(p.paymentMethodId));
    return {
      value: Number(p.paymentMethodId),
      label: String(p.paymentMethodName ?? meio?.name ?? p.paymentMethodId),
    };
  });
});

const meioPadrao = computed(() => {
  const marcado = (caixa.value?.payments ?? []).find((p) => p.isDefault);
  return marcado ? Number(marcado.paymentMethodId) : (opcoesDeMeio.value[0]?.value ?? null);
});

const totalDosItens = computed(() =>
  carrinho.value.reduce((soma, i) => soma + i.quantity * i.rate, 0),
);

const totalPago = computed(() =>
  pagamentos.value.reduce((soma, p) => soma + Number(p.amount || 0), 0),
);

const troco = computed(() => Math.max(totalPago.value - totalDosItens.value, 0));
const faltaPagar = computed(() => Math.max(totalDosItens.value - totalPago.value, 0));

const pagamentosValidos = computed(() =>
  pagamentos.value.filter((p) => p.paymentMethodId !== null && Number(p.amount || 0) > 0),
);

const podeVender = computed(
  () =>
    turno.data.value !== null &&
    carrinho.value.length > 0 &&
    pagamentosValidos.value.length > 0 &&
    faltaPagar.value < 0.005,
);

const podeAdicionar = computed(
  () =>
    itemEmDigitacao.value !== null &&
    Number(quantidade.value || 0) > 0 &&
    preco.value !== "" &&
    Number(preco.value) >= 0,
);

const avisoDoPreco = computed(() => {
  if (itemEmDigitacao.value === null) return null;
  if (buscandoPreco.value) return { texto: "Buscando o preço na lista do caixa...", alerta: false };
  if (listaDePrecoId.value === null) {
    return { texto: "Este caixa não tem lista de preços configurada.", alerta: true };
  }
  if (precoDaLista.value === null) {
    return { texto: "A lista do caixa não tem preço para este item.", alerta: true };
  }
  return {
    texto: origemDoPreco.value
      ? `Preço da lista do caixa — ${origemDoPreco.value}.`
      : "Preço da lista do caixa.",
    alerta: false,
  };
});

let consultaDePreco = 0;

async function atualizarPreco(): Promise<void> {
  const marca = ++consultaDePreco;
  precoDaLista.value = null;
  origemDoPreco.value = "";

  const itemId = itemEmDigitacao.value;
  if (itemId === null || listaDePrecoId.value === null) return;

  buscandoPreco.value = true;

  try {
    const achado = await resolverPreco(listaDePrecoId.value, Number(itemId), clienteId.value);
    if (marca !== consultaDePreco) return;
    precoDaLista.value = achado.rate;
    origemDoPreco.value = achado.matchedBy;
    if (achado.rate !== null) preco.value = String(achado.rate);
  } catch (e) {
    if (marca === consultaDePreco) falha.value = e instanceof Error ? e.message : String(e);
  } finally {
    if (marca === consultaDePreco) buscandoPreco.value = false;
  }
}

watch([itemEmDigitacao, listaDePrecoId, clienteId], () => void atualizarPreco());

function itemEscolhido(registro: Registro): void {
  rotuloEmDigitacao.value = refItem.rotulo(registro);
  void nextTick(() => campoDeQuantidade.value?.focar());
}

function limparDigitacao(): void {
  itemEmDigitacao.value = null;
  rotuloEmDigitacao.value = "";
  quantidade.value = "1";
  preco.value = "";
  precoDaLista.value = null;
  origemDoPreco.value = "";
}

function adicionar(): void {
  if (!podeAdicionar.value) return;

  const itemId = Number(itemEmDigitacao.value);
  const rate = Number(preco.value);
  const quantity = Number(quantidade.value);
  const repetido = carrinho.value.find((i) => i.itemId === itemId && i.rate === rate);

  if (repetido) repetido.quantity += quantity;
  else carrinho.value.push({ itemId, rotulo: rotuloEmDigitacao.value, quantity, rate });

  limparDigitacao();
  campoDeProduto.value?.focar();
}

function remover(item: ItemDoCarrinho): void {
  carrinho.value = carrinho.value.filter((i) => i !== item);
}

function removerUltimo(): void {
  carrinho.value = carrinho.value.slice(0, -1);
}

function limparCarrinho(): void {
  carrinho.value = [];
  limpandoCarrinho.value = false;
}

function acrescentarPagamento(): void {
  pagamentos.value = [
    ...pagamentos.value,
    { paymentMethodId: meioPadrao.value, amount: String(faltaPagar.value || "") },
  ];
}

function removerPagamento(indice: number): void {
  pagamentos.value = pagamentos.value.filter((_, i) => i !== indice);
  if (pagamentos.value.length === 0) {
    pagamentos.value = [{ paymentMethodId: meioPadrao.value, amount: "" }];
  }
}

function limpar(): void {
  carrinho.value = [];
  pagamentos.value = [{ paymentMethodId: meioPadrao.value, amount: "" }];
  clienteId.value = null;
  observacoes.value = "";
  falha.value = null;
  limparDigitacao();
}

const vender = useMutation({
  mutationFn: () =>
    venderNoBalcao(caixaId.value!, {
      customerId: clienteId.value ?? undefined,
      remarks: observacoes.value || undefined,
      items: carrinho.value.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
        rate: i.rate,
      })),
      payments: pagamentosValidos.value.map((p) => ({
        paymentMethodId: Number(p.paymentMethodId),
        amount: Number(p.amount),
      })),
    }),
  onSuccess: (resultado) => {
    cupom.value = resultado;
    limpar();
    void clienteDeConsulta.invalidateQueries({ queryKey: ["turno-aberto"] });
  },
  onError: (erro: unknown) => {
    falha.value = erro instanceof Error ? erro.message : String(erro);
  },
});

function fecharVenda(): void {
  if (podeVender.value && !vender.isPending.value) vender.mutate();
}

function porTecla(evento: KeyboardEvent): void {
  if (cupom.value || abrindoTurno.value || limpandoCarrinho.value) return;
  if (avisandoSemCaixa.value) return;

  const acoes: Record<string, () => void> = {
    F2: () => campoDeProduto.value?.focar(),
    F3: () => campoDeQuantidade.value?.focar(),
    F4: () => campoDePreco.value?.focar(),
    F6: () => campoDeCliente.value?.focar(),
    F7: () => camposDeValor.value[0]?.focar(),
    F8: removerUltimo,
    F9: fecharVenda,
    Escape: limparDigitacao,
  };

  const acao = acoes[evento.key];
  if (!acao) return;

  evento.preventDefault();
  acao();
}

onMounted(() => window.addEventListener("keydown", porTecla));
onBeforeUnmount(() => window.removeEventListener("keydown", porTecla));

function turnoAberto(): void {
  abrindoTurno.value = false;
  void clienteDeConsulta.invalidateQueries({ queryKey: ["turno-aberto"] });
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <GsSelect
        v-model="caixaSelecionado"
        label="Caixa"
        :options="opcoesDeCaixa"
        placeholder="Selecione..."
        class="w-64"
      />
      <div class="flex items-center gap-3">
        <GsBadge v-if="turno.data.value" tone="success">
          Turno {{ turno.data.value.number }} aberto
        </GsBadge>
        <GsBadge v-else-if="caixaId !== null && !turno.isPending.value" tone="warning">
          Sem turno aberto
        </GsBadge>
        <GsButton
          v-if="!turno.data.value && caixaId !== null"
          :disabled="turno.isPending.value"
          @click="abrindoTurno = true"
        >
          Abrir turno
        </GsButton>
      </div>
    </div>

    <p v-if="semEmpresa" class="text-body text-ink-soft">{{ EXIGE_EMPRESA }}</p>

    <p v-else-if="semCaixa" class="text-body text-ink-soft">
      Nenhum caixa cadastrado nesta empresa.
    </p>

    <div
      v-if="falha"
      class="flex items-start gap-2.5 rounded-card border border-danger bg-danger-bg px-4 py-3"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0 text-danger" />
      <p class="text-body text-danger">{{ falha }}</p>
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
      <GsCard alto>
        <div class="flex min-h-0 flex-1 flex-col gap-4">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-overline text-ink-mute uppercase">Itens</h2>
            <button
              v-if="carrinho.length > 0"
              type="button"
              class="flex cursor-pointer items-center gap-1.5 rounded-control px-2 py-1 text-small font-medium text-ink-mute transition-colors hover:bg-danger-bg hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              @click="limpandoCarrinho = true"
            >
              <Trash2 class="size-3.5" />
              Limpar carrinho
            </button>
          </div>

          <div class="flex flex-col gap-2">
            <div class="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_6rem_8rem_auto]">
              <GsCombo
                ref="campoDeProduto"
                v-model="itemEmDigitacao"
                label="Produto"
                :endpoint="refItem.endpoint"
                :rotulo="refItem.rotulo"
                busca
                limpavel
                placeholder="Busque pelo código ou nome"
                @escolhido="itemEscolhido"
              />
              <GsInput
                ref="campoDeQuantidade"
                v-model="quantidade"
                label="Qtd."
                type="number"
                :min="0"
                @keydown.enter.prevent="adicionar"
              />
              <GsInput
                ref="campoDePreco"
                v-model="preco"
                label="Preço"
                type="number"
                placeholder="Da lista"
                @keydown.enter.prevent="adicionar"
              />
              <GsButton :disabled="!podeAdicionar" @click="adicionar">
                <Plus class="size-4" />
                Adicionar
              </GsButton>
            </div>

            <p
              v-if="avisoDoPreco"
              class="text-small"
              :class="avisoDoPreco.alerta ? 'text-warning' : 'text-ink-mute'"
            >
              {{ avisoDoPreco.texto }}
            </p>
          </div>

          <div class="min-h-0 max-h-[50vh] flex-1 overflow-y-auto">
            <GsTabelaCompacta
              v-if="carrinho.length > 0"
              :colunas="COLUNAS_DO_CARRINHO"
              :linhas="carrinho"
              :chave="(item) => `${item.itemId}-${item.rate}`"
              embutida
            >
              <template #linha="{ item }">
                <td class="px-4 py-2 text-ink">{{ item.rotulo }}</td>
                <td class="px-4 py-2 text-right tabular-nums text-ink">{{ item.quantity }}</td>
                <td class="px-4 py-2 text-right tabular-nums text-ink-soft">
                  {{ dinheiro(item.rate) }}
                </td>
                <td class="px-4 py-2 text-right font-medium tabular-nums text-ink">
                  {{ dinheiro(item.quantity * item.rate) }}
                </td>
                <td class="px-2 py-2">
                  <div class="flex justify-end">
                    <GsIconButton tone="danger" label="Remover do carrinho" @click="remover(item)">
                      <Trash2 class="size-4" />
                    </GsIconButton>
                  </div>
                </td>
              </template>
            </GsTabelaCompacta>

            <div
              v-else
              class="flex h-full flex-col items-center justify-center gap-2 py-10 text-center"
            >
              <ShoppingCart class="size-16 text-ink-mute" />
              <p class="text-body text-ink-soft">Carrinho vazio, vamos começar a vender?</p>
            </div>
          </div>

          <div class="mt-auto flex items-center justify-between border-t border-line pt-4">
            <span class="text-overline text-ink-mute uppercase">Total</span>
            <span class="text-value tabular-nums text-ink">{{ dinheiro(totalDosItens) }}</span>
          </div>
        </div>
      </GsCard>

      <GsCard>
        <div class="flex flex-col gap-4">
          <h2 class="text-overline text-ink-mute uppercase">Pagamento</h2>

          <GsCombo
            ref="campoDeCliente"
            v-model="clienteId"
            label="Cliente"
            :endpoint="refCliente.endpoint"
            :rotulo="refCliente.rotulo"
            busca
            limpavel
            hint="Em branco, usa o cliente padrão do caixa."
          />

          <div class="flex flex-col gap-3">
            <div
              v-for="(pagamento, indice) in pagamentos"
              :key="indice"
              class="grid grid-cols-[1fr_7rem_2.5rem] items-end gap-2"
            >
              <GsSelect
                v-model="pagamento.paymentMethodId"
                :label="indice === 0 ? 'Meio' : undefined"
                :options="opcoesDeMeio"
                placeholder="Selecione..."
              />
              <GsInput
                ref="camposDeValor"
                v-model="pagamento.amount"
                :label="indice === 0 ? 'Valor' : undefined"
                type="number"
              />
              <GsIconButton
                tone="danger"
                size="lg"
                label="Remover pagamento"
                @click="removerPagamento(indice)"
              >
                <Trash2 class="size-4" />
              </GsIconButton>
            </div>
          </div>

          <GsButton variant="secondary" @click="acrescentarPagamento">
            <Plus class="size-4" />
            Outro meio
          </GsButton>

          <dl class="flex flex-col gap-2 border-t border-line pt-4 text-body">
            <div class="flex justify-between">
              <dt class="text-ink-soft">Recebido</dt>
              <dd class="tabular-nums text-ink">{{ dinheiro(totalPago) }}</dd>
            </div>
            <div v-if="faltaPagar > 0.004" class="flex justify-between">
              <dt class="text-danger">Falta</dt>
              <dd class="font-medium tabular-nums text-danger">{{ dinheiro(faltaPagar) }}</dd>
            </div>
            <div v-else class="flex justify-between">
              <dt class="text-ink-soft">Troco</dt>
              <dd class="font-medium tabular-nums text-ink">{{ dinheiro(troco) }}</dd>
            </div>
          </dl>

          <GsTextarea v-model="observacoes" label="Observações do cupom" />

          <GsButton :disabled="!podeVender || vender.isPending.value" @click="fecharVenda">
            <Receipt class="size-4" />
            Fechar venda
          </GsButton>
        </div>
      </GsCard>
    </div>

    <footer
      class="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-line bg-surface px-4 py-3"
    >
      <span class="text-overline text-ink-mute uppercase">Atalhos do teclado</span>
      <span
        v-for="atalho in ATALHOS"
        :key="atalho.tecla"
        class="flex items-center gap-1.5 text-small text-ink-soft"
      >
        <kbd
          class="rounded-sm border border-line-strong bg-app px-1.5 py-0.5 text-caption font-semibold text-ink"
        >
          {{ atalho.tecla }}
        </kbd>
        {{ atalho.acao }}
      </span>
    </footer>

    <AberturaDeTurno v-if="abrindoTurno" @fechar="abrindoTurno = false" @aberto="turnoAberto" />

    <CupomDaVenda v-if="cupom" :cupom="cupom" @fechar="cupom = null" />

    <SemCaixa v-if="avisandoSemCaixa" @fechar="semCaixaDispensado = true" />

    <GsConfirmacao
      v-if="limpandoCarrinho"
      titulo="Limpar carrinho"
      mensagem="Remover todos os produtos do carrinho? Os itens já adicionados serão perdidos."
      rotulo-confirmar="Limpar"
      perigo
      @confirmar="limparCarrinho"
      @fechar="limpandoCarrinho = false"
    />
  </div>
</template>
