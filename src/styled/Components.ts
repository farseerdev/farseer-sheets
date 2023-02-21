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

export const ButtonBox = styled('div')<{ $active: boolean; $disabled: boolean }>(({ theme, $active, $disabled }) => ({
    display: 'flex',
    alignItems: 'center',
    borderRadius: theme.borderRadius.m,
    padding: theme.space.m,
    height: '24px',
    fontWeight: 700,
    cursor: $disabled ? 'not-allowed' : 'pointer',
    pointerEvents: $disabled ? 'none' : 'all',
    opacity: $disabled ? 0.6 : 1,
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
    display: 'flex',
    alignItems: 'center',

    label: {
        padding: `${theme.space.s} ${theme.space.m}`,
    },

    '&:hover': {
        backgroundColor: $active ? theme.colors.purple.w100 : theme.colors.neutral.w100,
    },
}));

export const ToolbarButtonLabel = styled('div')(({ theme }) => ({
    padding: `${theme.space.s} ${theme.space.s} ${theme.space.s} ${theme.space.m}`,
}));

export const CheckboxWrap = styled('div')(({ theme }) => ({
    display: 'flex',
    gap: theme.space.m,
    cursor: 'pointer',
}));

export const SelectContainer = styled('div')(() => ({
    position: 'relative',
}));

export const SelectOptions = styled('div')(({ theme }) => ({
    position: 'absolute',
    top: 'calc(100% + 10px)',
    backgroundColor: theme.colors.ui.white,
    border: `1px solid ${theme.borderColor}`,
    boxShadow: theme.boxShadow,
    right: 0,
    zIndex: 1,
    maxHeight: '500px',
    overflow: 'auto',
}));

export const SelectOption = styled('div')(({ theme }) => ({
    padding: `${theme.space.s} ${theme.space.m}`,
    borderBottom: `1px solid ${theme.borderColor}`,
    fontSize: theme.font.normalSize,
    lineHeight: 1.4,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    '&:last-child': {
        borderBottom: 'none',
    },
    '&:hover': {
        backgroundColor: theme.colors.neutral.w100,
    },
}));

export const FormulaCellBadge = styled('div')(({ theme }) => ({
    background: theme.colors.purple.w500,
    padding: theme.space.s,
    borderRadius: theme.borderRadius.m,
    height: '24px',
    minWidth: '26px',
    color: theme.colors.ui.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.space.m,
}));

export const FormulaInputBox = styled('div')(({ theme }) => ({
    border: `1px solid ${theme.colors.neutral.w300}`,
    padding: theme.space.s,
    borderRadius: theme.borderRadius.m,
    height: '24px',
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',

    '&:hover': {
        borderColor: theme.colors.neutral.w500,
    },
    '&:focus-within': {
        borderColor: theme.colors.purple.w500,
    },
}));

export const FormulaInput = styled('input')(({ theme }) => ({
    border: 'none',
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    fontSize: theme.font.normalSize,
    lineHeight: 1.2,
    outline: 'none',
}));

export const Input = styled('input')(({ theme }) => ({
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    fontSize: theme.font.normalSize,
    lineHeight: 1.2,
    outline: 'none',
    border: `1px solid ${theme.colors.neutral.w300}`,
    padding: theme.space.s,
    borderRadius: theme.borderRadius.m,
    height: '24px',

    '&:hover': {
        borderColor: theme.colors.neutral.w500,
    },
    '&:focus': {
        borderColor: theme.colors.purple.w500,
    },
}));

export const ForumulaIconBox = styled('div')(({ theme }) => ({
    padding: `0px ${theme.space.s}`,
}));

export const Popover = styled('div')(({ theme }) => ({
    padding: `${theme.space.xl}`,
    background: theme.colors.ui.white,
    position: 'absolute',
    top: '80px',
    right: '20px',
    zIndex: 13,
    borderRadius: theme.borderRadius.l,
    boxShadow: theme.boxShadow2,
    border: `1px solid ${theme.colors.neutral.w300}`,
    width: '390px',
}));

export const PopoverTitle = styled('div')(({ theme }) => ({
    fontSize: theme.font.titleSize,
    fontWeight: 700,
}));

export const PopoverCard = styled('div')(({ theme }) => ({
    marginTop: theme.space.m,
    p: {
        color: theme.colors.neutral.w700,
        fontWeight: 400,
        marginBottom: theme.space.m,
    },
}));

export const SmallTitle = styled('div')(({ theme }) => ({
    fontSize: theme.font.normalSize,
    fontWeight: 700,
}));
