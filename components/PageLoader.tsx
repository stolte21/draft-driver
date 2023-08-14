import { Flex, Skeleton } from '@chakra-ui/react';

const PageLoader = () => {
  return (
    <Flex height="100%" width="100%" flexDirection="column" gap={2}>
      <Flex flexDirection={['column', 'row']} gap={[1, 2]}>
        {[1, 2].map((_) => (
          <Skeleton key={_} height="40px" width="100%" />
        ))}
      </Flex>
      <Skeleton flexGrow={1} width="100%" />
    </Flex>
  );
};

export default PageLoader;
