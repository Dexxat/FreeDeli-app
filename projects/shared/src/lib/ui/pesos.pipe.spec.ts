import { formatearPesos } from './pesos.pipe';

describe('formatearPesos', () => {
  it('usa punto de miles y sin decimales', () => {
    expect(formatearPesos(1800)).toBe('$1.800');
    expect(formatearPesos(14400.4)).toBe('$14.400');
    expect(formatearPesos(0)).toBe('$0');
  });
});
