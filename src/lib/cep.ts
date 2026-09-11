import type { Registro } from "@/api/lista";
import type { ConsultaDeCampo, Valores } from "./formulario";
import { soDigitos } from "./mascaras";

const VIACEP = "https://viacep.com.br/ws";

/**
 * O ViaCEP responde 200 com `{ erro: true }` para CEP inexistente, e o `fetch` não trata isso
 * como falha. Sem checar, o formulário limparia os campos achando que a consulta deu certo.
 */
async function buscarNoViaCep(cep: string): Promise<Registro> {
  const resposta = await fetch(`${VIACEP}/${cep}/json/`);
  if (!resposta.ok) throw new Error("A consulta de CEP não respondeu.");

  const dados = (await resposta.json()) as Registro;
  if (dados.erro) throw new Error("CEP não encontrado.");

  return dados;
}

export const consultaDeCep: ConsultaDeCampo = {
  rotulo: "Buscar CEP",
  endpoint: VIACEP,
  parametro: "cep",
  buscar: buscarNoViaCep,
  chave: (valor) => (soDigitos(valor).length === 8 ? soDigitos(valor) : null),
  mapear: (resposta) => {
    const sugerido: Valores = { countryCode: "BR" };
    if (resposta.logradouro) sugerido.street = resposta.logradouro;
    if (resposta.bairro) sugerido.district = resposta.bairro;
    if (resposta.localidade) sugerido.city = resposta.localidade;
    if (resposta.uf) sugerido.stateCode = resposta.uf;
    if (resposta.ibge) sugerido.ibgeCityCode = resposta.ibge;
    return sugerido;
  },
};
