import React, { ReactElement } from 'react';
import { Checked, Unchecked } from '../icons/icons';
import { CheckboxWrap } from '../styled/Components';
import { appColors } from '../styled/useTheme';

type CheckboxProps = {
    label: string;
    checked: boolean;
    onClick: () => void;
};

export function Checkbox({ label, checked = false, onClick }: CheckboxProps): ReactElement {
    return (
        <CheckboxWrap onClick={onClick}>
            {checked ? <Checked color={appColors.purple.w500} /> : <Unchecked color={appColors.neutral.w300} />}
            {label}
        </CheckboxWrap>
    );
}
