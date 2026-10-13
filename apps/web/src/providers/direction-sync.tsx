import { useDirection } from '@mantine/core';
import { useEffect } from 'react';
import { useLanguage } from '../i18n/use-language';

export function DirectionSync(): null {
  const { direction } = useLanguage();
  const { dir, setDirection } = useDirection();

  useEffect(() => {
    if (dir !== direction) {
      setDirection(direction);
    }
  }, [dir, direction, setDirection]);

  return null;
}
