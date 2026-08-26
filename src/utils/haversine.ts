/**
 * Distância em linha reta entre duas coordenadas, em quilômetros.
 *
 * Fórmula de Haversine. É a distância "de pássaro", não a rodada — o trajeto
 * real é sempre maior, tipicamente entre 20% e 40% em malha urbana. Para
 * escolher faixa de frete isso basta, e evita depender de um serviço externo
 * de rotas, que custa por chamada e adiciona um ponto de falha no caminho
 * crítico de criar um pedido.
 *
 * Se um dia a diferença incomodar, o lugar de trocar é aqui: a assinatura
 * continua a mesma e o resto do cálculo não muda.
 */

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function distanceInKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
