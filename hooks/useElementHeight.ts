import { useState, useRef, useEffect } from 'react';

const useElementHeight = () => {
  const [height, setHeight] = useState(0);
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setHeight(entries[0].contentRect.height);
    });

    observer.observe(element.current!);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { element, height };
};

export default useElementHeight;
