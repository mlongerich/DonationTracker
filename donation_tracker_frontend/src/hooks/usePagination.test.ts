import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  it('initializes with default page 1', () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.currentPage).toBe(1);
  });

  it('handles page change', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.handlePageChange({} as React.ChangeEvent<unknown>, 3);
    });

    expect(result.current.currentPage).toBe(3);
  });

  it('resets to first page', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setCurrentPage(5);
    });

    expect(result.current.currentPage).toBe(5);

    act(() => {
      result.current.resetToFirstPage();
    });

    expect(result.current.currentPage).toBe(1);
  });
});
