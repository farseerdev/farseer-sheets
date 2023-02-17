import React, { ReactElement } from 'react';
import {
    PrimaryButtonBox,
    PrimaryInvertedButtonBox,
    SecondaryButtonBox,
    SecondaryInvertedButtonBox,
} from '../styled/Components';

export enum ButtonType {
    Primary = 'primary',
    Secondary = 'secondary',
}

type ButtonProps = {
    type: ButtonType;
    inverted?: boolean;
    label: string;
    active?: boolean;
    onClick: () => void;
};

export function Button({ label, active = false, type, inverted = false, onClick }: ButtonProps): ReactElement {
    let ButtonComponent = PrimaryButtonBox;
    if (type === ButtonType.Primary && inverted) {
        ButtonComponent = PrimaryInvertedButtonBox;
    } else if (type === ButtonType.Secondary && inverted) {
        ButtonComponent = SecondaryInvertedButtonBox;
    } else if (type === ButtonType.Secondary) {
        ButtonComponent = SecondaryButtonBox;
    }
    return (
        <ButtonComponent $active={active} onClick={onClick}>
            {label}
        </ButtonComponent>
    );
}
