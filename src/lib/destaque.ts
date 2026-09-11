import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * O campo que a mensagem mandou corrigir, lido da query `destacar`.
 *
 * Levar a pessoa à tela certa e deixá-la procurar o campo no meio do formulário desfaz metade do
 * favor. O destaque não expira por tempo de chegada: o destino costuma ser uma lista, e o campo só
 * existe quando ela abre o registro — contar do desembarque apagaria o destaque antes da abertura.
 * Quem exibe é quem encerra, chamando `concluir`.
 */
export function useDestaque() {
  const route = useRoute();
  const router = useRouter();
  const encerrado = ref(false);

  const campo = computed(() => {
    if (encerrado.value) return null;
    const valor = route.query.destacar;
    return typeof valor === "string" && valor ? valor : null;
  });

  function concluir(): void {
    encerrado.value = true;

    const { destacar, ...resto } = route.query;
    if (destacar === undefined) return;
    void router.replace({ path: route.path, query: resto });
  }

  return { campo, concluir };
}

export const DURACAO_DO_DESTAQUE = 5000;

export const CLASSES_DE_DESTAQUE =
  "rounded-control ring-2 ring-primary ring-offset-2 ring-offset-surface";
