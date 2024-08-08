import { Flex, Skeleton, Grid, GridItem } from '@chakra-ui/react';

const PageLoader = () => {
  return (
    <Flex
      height="100%"
      width="100%"
      flexDirection="column"
      gap={2}
      paddingTop={1}
      paddingLeft={1}
      paddingRight={1}
      paddingBottom={2}
    >
      <Flex flexDirection={['column', 'row']} gap={[2]}>
        {[1, 2].map((_) => (
          <Skeleton key={_} height="40px" width="100%" />
        ))}
      </Flex>
      <Grid
        gridTemplateColumns="repeat(12, 1fr)"
        gridGap={2}
        flexGrow={1}
        overflow="hidden"
      >
        <GridItem colSpan={[12, 8]}>
          <Skeleton height="100%" width="100%" />
        </GridItem>
        <GridItem colSpan={[12, 4]}>
          <Skeleton height="100%" width="100%" />
        </GridItem>
      </Grid>
      <Skeleton height="50px" />
    </Flex>
  );
};

export default PageLoader;
