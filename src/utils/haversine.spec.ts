import { distanceInKm } from './haversine';

describe('distanceInKm', () => {
  it('devolve zero para o mesmo ponto', () => {
    const ponto = { latitude: -18.9186, longitude: -48.2772 };
    expect(distanceInKm(ponto, ponto)).toBe(0);
  });

  it('mede uma distância urbana conhecida', () => {
    // Praça Tubal Vilela e Parque do Sabiá, em Uberlândia: ~6 km em linha reta.
    const centro = { latitude: -18.9186, longitude: -48.2772 };
    const sabia = { latitude: -18.9086, longitude: -48.2216 };

    expect(distanceInKm(centro, sabia)).toBeGreaterThan(5);
    expect(distanceInKm(centro, sabia)).toBeLessThan(7);
  });

  it('mede uma distância intermunicipal conhecida', () => {
    // Uberlândia → Belo Horizonte: ~469 km em linha reta.
    const uberlandia = { latitude: -18.9186, longitude: -48.2772 };
    const beloHorizonte = { latitude: -19.9167, longitude: -43.9345 };

    expect(distanceInKm(uberlandia, beloHorizonte)).toBeGreaterThan(455);
    expect(distanceInKm(uberlandia, beloHorizonte)).toBeLessThan(485);
  });

  it('é simétrica', () => {
    const a = { latitude: -18.9186, longitude: -48.2772 };
    const b = { latitude: -19.9167, longitude: -43.9345 };

    expect(distanceInKm(a, b)).toBeCloseTo(distanceInKm(b, a), 6);
  });

  it('atravessa o equador e o meridiano sem erro de sinal', () => {
    const norte = { latitude: 1, longitude: 1 };
    const sul = { latitude: -1, longitude: -1 };

    // ~314 km: dois graus de latitude mais dois de longitude junto ao equador.
    expect(distanceInKm(norte, sul)).toBeGreaterThan(300);
    expect(distanceInKm(norte, sul)).toBeLessThan(320);
  });
});
