import { extendTheme, Theme } from '@chakra-ui/react';

const themeObject: Partial<Theme> = {
    styles: {
        global: {
            '::-webkit-scrollbar': {
                width: '8px',
                height: '8px'
            },
            '::-webkit-scrollbar-track': {
                backgroundColor: 'gray.900'
            },

            '::-webkit-scrollbar-thumb': {
                backgroundColor: 'gray.500'
            },
            '*': {
                scrollbarWidth: 'thin',
                scrollbarColor: 'gray.500 gray.900'
            }
        }
    }
};
const theme = extendTheme(themeObject);

export default theme;
