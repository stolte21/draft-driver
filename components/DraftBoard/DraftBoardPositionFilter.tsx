import React, { useMemo } from 'react';
import { HStack, Button, Divider } from '@chakra-ui/react';
import HeartIcon from 'components/Icons/HeartIcon';
import { positionsList, hasOnlySpecialFilters } from 'utils';
import { Position, SpecialFilter } from 'types';

type DraftBoardPositionFilterProps = {
  filters: Set<Position | SpecialFilter>;
  onChangeFilter: (newSet: Set<Position | SpecialFilter>) => void;
};

type Filter = Position | SpecialFilter | 'ALL';

const ACTIVE_FILTER_PROPS = {
  variant: 'solid',
  colorScheme: 'blue',
  border: '1px solid transparent',
};

const INACTIVE_FILTER_PROPS = {
  variant: 'outline',
};

const DraftBoardPositionFilter = (props: DraftBoardPositionFilterProps) => {
  const buttons: Filter[] = ['ALL', ...positionsList];

  const isOnlySpecial = useMemo(
    () => hasOnlySpecialFilters(props.filters),
    [props.filters]
  );

  const handlePositionClick = (filter: Filter) => {
    if (filter === 'ALL') {
      // 'ALL' specifically refers to positions and not special filters like
      // rookies or favorites. So we need to specifically keep the state
      // of the special filters.
      const specialFilters = Array.from(props.filters.values()).filter(
        (value) => value === 'R' || value === 'FAV'
      );
      props.onChangeFilter(new Set(specialFilters));
    } else {
      const newSet = new Set(props.filters);
      if (newSet.has(filter)) newSet.delete(filter);
      else newSet.add(filter);

      props.onChangeFilter(newSet);
    }
  };

  return (
    <HStack padding={1} marginLeft={2} overflow="hidden">
      {buttons.map((filter) => (
        <Button
          key={filter}
          size="xs"
          onClick={() => handlePositionClick(filter)}
          {...((filter === 'ALL' && isOnlySpecial) ||
          (filter !== 'ALL' && props.filters.has(filter))
            ? ACTIVE_FILTER_PROPS
            : INACTIVE_FILTER_PROPS)}
        >
          {filter}
        </Button>
      ))}
      <Divider orientation="vertical" color="white" height={5} />
      <Button
        size="xs"
        onClick={() => handlePositionClick('R')}
        {...(props.filters.has('R')
          ? ACTIVE_FILTER_PROPS
          : INACTIVE_FILTER_PROPS)}
      >
        R
      </Button>
      <Button
        size="xs"
        onClick={() => handlePositionClick('FAV')}
        {...(props.filters.has('FAV')
          ? ACTIVE_FILTER_PROPS
          : INACTIVE_FILTER_PROPS)}
      >
        <HeartIcon />
      </Button>
    </HStack>
  );
};

export default DraftBoardPositionFilter;
