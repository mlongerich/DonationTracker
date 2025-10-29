import { renderHook, act } from '@testing-library/react';
import { useRansackFilters } from './useRansackFilters';

describe('useRansackFilters', () => {
  it('initializes with empty filters', () => {
    const { result } = renderHook(() => useRansackFilters());
    expect(result.current.filters).toEqual({});
  });

  it('sets a filter', () => {
    const { result } = renderHook(() => useRansackFilters());

    act(() => {
      result.current.setFilter('name_cont', 'John');
    });

    expect(result.current.filters).toEqual({ name_cont: 'John' });
  });

  it('removes filter when value is null', () => {
    const { result } = renderHook(() => useRansackFilters());

    act(() => {
      result.current.setFilter('name_cont', 'John');
      result.current.setFilter('name_cont', null);
    });

    expect(result.current.filters).toEqual({});
  });
});
