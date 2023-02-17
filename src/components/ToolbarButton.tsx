import React, { ComponentType, MouseEventHandler, ReactElement } from 'react';
import { IconProps } from '../icons/icons';
import { ToolbarButtonBox } from '../styled/Components';
import { appColors } from '../styled/useTheme';

type ToolbarButtonProps = {
    Icon: ComponentType<IconProps>;
    active?: boolean;
    onClick: () => void;
};

export function ToolbarButton({ Icon, active = false, onClick }: ToolbarButtonProps): ReactElement {
    return (
        <ToolbarButtonBox $active={active} onClick={onClick}>
            <Icon color={active ? appColors.purple.w500 : appColors.ui.dark} />
        </ToolbarButtonBox>
    );
}
