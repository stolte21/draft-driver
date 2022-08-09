import { useState, useRef, useEffect } from 'react';

const useScrollbar = (listItems: any[]) => {
  const [hasScrollbar, setHasScrollbar] = useState(false);
  const element = useRef<HTMLElement>(null);

  useEffect(() => {
    if (element.current) {
      setHasScrollbar(
        element.current.scrollHeight > element.current.clientHeight
      );
    } else {
      setHasScrollbar(false);
    }
  }, [listItems]);

  return { element, hasScrollbar };
};

export default useScrollbar;
