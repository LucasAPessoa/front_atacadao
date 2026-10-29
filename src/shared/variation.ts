/** Nome da variação do Bling vem cru ("Cor:Preto"): exibe com um espaço depois de ":" ("Cor: Preto"). */
export const formatVariationName = (name: string): string => name.replace(/(?<!\d):(?=\S)/g, ": ");
