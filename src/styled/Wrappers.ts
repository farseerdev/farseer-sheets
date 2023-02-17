import { styled, keyframes } from 'goober';
import { forwardRef } from 'react';

// helpers

export const FlexRow = styled('div')<{ $gap?: number }>(({ $gap = 0 }) => ({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: `${$gap}px`,
}));

export const FlexColumnDirection = styled('div')(() => ({
    display: 'flex',
    flexDirection: 'column',
}));

export const NoShrinkGrow = styled('div')(() => ({
    flexShrink: 0,
    flexGrow: 1,
}));

export const NoShrinkNoGrow = styled('div')(() => ({
    flexShrink: 0,
    flexGrow: 0,
}));

// app sections
export const Container = styled(FlexColumnDirection)(({ theme }) => ({
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    fontFamily: "'Inter', sans-serif",
    color: theme.colors.ui.dark,
    backgroundColor: theme.colors.neutral.w100,
    fontSize: theme.font.normalSize,
    padding: theme.space.xl,
}));

export const Header = styled(NoShrinkNoGrow)(({ theme }) => ({
    backgroundColor: theme.colors.purple.w500,
    borderRadius: theme.borderRadius.m,
    boxShadow: theme.boxShadow,
    marginBottom: theme.space.xl,
    padding: `${theme.space.s} ${theme.space.m}`,
    display: 'flex',
    alignItems: 'center',
}));

export const Toolbar = styled(NoShrinkNoGrow)(({ theme }) => ({
    backgroundColor: theme.colors.ui.white,
    borderTopLeftRadius: theme.borderRadius.m,
    borderTopRightRadius: theme.borderRadius.m,
    padding: theme.space.xl,
}));

export const SheetContainer = styled(NoShrinkGrow)(({ theme }) => ({
    backgroundColor: theme.colors.ui.white,
    width: '100%',
    position: 'relative',
}));

export const Footer = styled(NoShrinkNoGrow)(({ theme }) => ({
    color: theme.colors.neutral.w700,
    textAlign: 'center',
    padding: theme.space.xl,
    paddingBottom: 0,
}));
