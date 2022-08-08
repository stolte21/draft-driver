import { useState, useEffect } from 'react';

type DebounceOptions = {
    delay?: number;
};

const useDebounce = <T = string>(
    defaultValue: T,
    options: DebounceOptions = {}
) => {
    const { delay = 100 } = options;
    const [value, setValue] = useState<T>(defaultValue);
    const [debouncedValue, setDebouncedValue] = useState(defaultValue);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timeout);
    }, [value, delay]);

    return { value, debouncedValue, setValue };
};

export default useDebounce;
