import React from 'react';
import { HStack, Button } from '@chakra-ui/react';
import { positionsList } from 'utils';
import { Position } from 'types';

type DraftBoardPositionFilterProps = {
  filters: Set<Position>;
  onChangeFilter: (newSet: Set<Position>) => void;
};

type PositionAndAll = Position | 'ALL';

const DraftBoardPositionFilter = (props: DraftBoardPositionFilterProps) => {
  const buttons: PositionAndAll[] = ['ALL', ...positionsList];

  const handlePositionClick = (filter: PositionAndAll) => {
    if (filter === 'ALL') props.onChangeFilter(new Set());
    else {
      const newSet = new Set(props.filters);
      if (newSet.has(filter)) newSet.delete(filter);
      else newSet.add(filter);

      props.onChangeFilter(newSet);
    }
  };

  return (
    // TODO: add scrolling but hide scrollbars for the stack
    <HStack marginLeft={2} overflow="hidden">
      {buttons.map((filter) => (
        <Button
          key={filter}
          size="xs"
          onClick={() => handlePositionClick(filter)}
          {...((filter === 'ALL' && props.filters.size === 0) ||
          (filter !== 'ALL' && props.filters.has(filter))
            ? {
                variant: 'solid',
                colorScheme: 'linkedin',
                border: '1px solid transparent',
              }
            : { variant: 'outline' })}
        >
          {filter}
        </Button>
      ))}
    </HStack>
  );
};

export default DraftBoardPositionFilter;
