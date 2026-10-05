/**
 * Regras do upload direto — o caminho em que o arquivo NÃO passa pela API.
 *
 * Vive fora do service para o controller e os testes lerem os mesmos números
 * sem instanciar nada, e para que mudar um limite seja uma edição só.
 */

const MB = 1024 * 1024;

/**
 * Teto do upload direto, imposto pelo próprio S3.
 *
 * Duzentos megabytes cobre vídeo de celular de alguns minutos. O número vai
 * numa condição `content-length-range` da política assinada: quem tentar subir
 * mais que isso é recusado pela AWS, não por um `if` do front. É a razão de
 * usar POST pré-assinado em vez de PUT — o PUT assinado não permite condição
 * de tamanho, e o limite viraria promessa.
 */
export const LIMITE_UPLOAD_DIRETO = 200 * MB;

/** Quanto tempo a autorização de envio vale, em segundos. */
export const VALIDADE_DA_AUTORIZACAO = 15 * 60;

/**
 * Tipos aceitos no upload direto.
 *
 * Só vídeo. Foto continua pela rota comum, que é mais simples e já tem teto de
 * 10 MB — abrir o caminho direto para imagem traria a complexidade de três
 * passos sem resolver problema nenhum.
 */
export const TIPOS_DE_VIDEO = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/3gpp',
] as const;

export function ehVideoAceito(contentType: string): boolean {
  return (TIPOS_DE_VIDEO as readonly string[]).includes(contentType);
}
