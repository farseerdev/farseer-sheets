import { useRef, useEffect, useState } from 'react';

export function useDebounce<TValue = unknown>(watchedValue: TValue, delay: number) {
    const firstRender = useRef(true);
    const [state, dispatch] = useState(watchedValue);
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return () => {};
        }
        const timeoutId = setTimeout(() => dispatch(watchedValue), delay);
        return () => {
            clearTimeout(timeoutId);
        };
    }, [watchedValue]);
    return state;
}
