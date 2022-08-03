import type { NextPage } from 'next';
import { Button } from '@chakra-ui/react';

const Home: NextPage = () => {
    return (
        <div>
            Draft Driver{' '}
            <Button onClick={() => fetch('/api/players')}>Load</Button>
        </div>
    );
};

export default Home;
