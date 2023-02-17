import { styled, keyframes } from 'goober';
import { forwardRef } from 'react';

export const HeaderTitle = styled('a')(({ theme }) => ({
    color: theme.colors.ui.white,
    fontSize: theme.font.headerSize,
    fontWeight: 700,
    paddingLeft: theme.space.m,
    lineHeight: 1,
}));

// Button types:

export const ButtonBox = styled('div')<{ $active: boolean }>(({ theme, $active }) => ({
    display: 'flex',
    alignItems: 'center',
    borderRadius: theme.borderRadius.m,
    padding: theme.space.m,
    height: '24px',
    fontWeight: 700,
    cursor: 'pointer',
}));
export const PrimaryButtonBox = styled(ButtonBox)<{ $active: boolean }>(({ theme, $active }) => ({
    color: theme.colors.ui.white,
    backgroundColor: $active ? theme.colors.purple.w900 : theme.colors.purple.w500,

    '&:hover': {
        backgroundColor: $active ? theme.colors.purple.w900 : theme.colors.purple.w700,
    },
}));
export const PrimaryInvertedButtonBox = styled(ButtonBox)<{ $active: boolean }>(({ theme, $active }) => ({
    color: $active ? theme.colors.purple.w900 : theme.colors.purple.w500,
    backgroundColor: $active ? theme.colors.neutral.w300 : theme.colors.ui.white,

    '&:hover': {
        color: $active ? theme.colors.purple.w900 : theme.colors.purple.w700,
        backgroundColor: $active ? theme.colors.neutral.w300 : theme.colors.neutral.w100,
    },
}));
export const SecondaryButtonBox = styled(ButtonBox)<{ $active: boolean }>(({ theme, $active }) => ({
    color: theme.colors.purple.w500,
    backgroundColor: $active ? theme.colors.neutral.w300 : theme.colors.ui.transparent,

    '&:hover': {
        backgroundColor: $active ? theme.colors.purple.w300 : theme.colors.purple.w100,
    },
}));
export const SecondaryInvertedButtonBox = styled(ButtonBox)<{ $active: boolean }>(({ theme, $active }) => ({
    color: $active ? theme.colors.neutral.w500 : theme.colors.ui.white,
    backgroundColor: theme.colors.ui.transparent,

    '&:hover': {
        color: $active ? theme.colors.neutral.w500 : theme.colors.neutral.w300,
    },
}));

export const Link = styled('a')(({ theme }) => ({
    color: theme.colors.purple.w500,
    cursor: 'pointer',
}));

export const Spacer = styled('div')(({ theme }) => ({
    flexGrow: 10,
}));

export const ToolbarBreak = styled('div')(({ theme }) => ({
    height: '16px',
    width: '1px',
    backgroundColor: theme.colors.neutral.w300,
    margin: `0px ${theme.space.s}`,
}));

export const ToolbarButtonBox = styled('div')<{ $active: boolean }>(({ theme, $active }) => ({
    color: $active ? theme.colors.purple.w500 : theme.colors.ui.dark,
    backgroundColor: $active ? theme.colors.purple.w100 : theme.colors.ui.transparent,
    borderRadius: theme.borderRadius.m,
    height: '24px',
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: $active ? theme.colors.purple.w100 : theme.colors.neutral.w100,
    },
}));

export const CheckboxWrap = styled('div')(({ theme }) => ({
    display: 'flex',
    gap: theme.space.m,
    cursor: 'pointer',
}));
