import { createContext, useContext } from 'react';
import 'goober';

export const appColors = {
    neutral: {
        w100: '#F6F9FC',
        w300: '#E4E9F0',
        w500: '#AAC0DA',
        w700: '#6B83A0',
    },
    purple: {
        w100: '#F1E5FF',
        w300: '#CEA9FF',
        w500: '#7000FF',
        w700: '#5600C3',
        w900: '#320073',
    },
    ui: {
        white: '#FFFFFF',
        dark: '#1D064D',
        transparent: '#FFFFFF00',
    },
};

export type AppColorsType = typeof appColors;

declare module 'goober' {
    export interface DefaultTheme {
        colors: AppColorsType;
        font: {
            normalSize: string;
            titleSize: string;
            headerSize: string;
        };
        borderRadius: {
            s: string;
            m: string;
            l: string;
        };
        space: {
            xs: string;
            s: string;
            m: string;
            l: string;
            xl: string;
        };
        borderColor: string;
        boxShadow: string;
        boxShadow2: string;
    }
}

const theme = {
    colors: appColors,
    font: {
        normalSize: '11px',
        titleSize: '14px',
        headerSize: '20px',
    },
    borderRadius: {
        s: '3px',
        m: '6px',
        l: '10px',
    },
    space: {
        xs: '2px',
        s: '4px',
        m: '8px',
        l: '15px',
        xl: '20px',
    },
    borderColor: '#E9EEF5',
    boxShadow: '0px 4px 16px rgba(112, 0, 255, 0.25)',
    boxShadow2: '0px 4px 16px rgba(107, 131, 160, 0.15)',
};

const ThemeContext = createContext(theme);
const useTheme = () => useContext(ThemeContext);

export default useTheme;
