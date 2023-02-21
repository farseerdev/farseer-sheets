import React, { ReactElement } from 'react';
import { Forumula } from '../icons/icons';
import { FormulaCellBadge, FormulaInput, FormulaInputBox, ForumulaIconBox, ToolbarBreak } from '../styled/Components';
import { FlexRow } from '../styled/Wrappers';

type CheckboxProps = {
    selectedString: string;
    value: string;
    onChange: (e: string) => void;
    onEnter: () => void;
    onEscape: () => void;
    onBlur: () => void;
};

export function FormulaBar({
    selectedString,
    value,
    onChange,
    onEnter,
    onEscape,
    onBlur,
}: CheckboxProps): ReactElement {
    return (
        <FlexRow style={{ marginTop: 10 }}>
            <FormulaCellBadge>{selectedString}</FormulaCellBadge>
            <FormulaInputBox>
                <ForumulaIconBox>
                    <Forumula />
                </ForumulaIconBox>
                <ToolbarBreak />
                <FormulaInput
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onEnter();
                            e.preventDefault();
                            //@ts-ignore
                            e.target.blur();
                        } else if (e.key === 'Escape') {
                            onEscape();
                        }
                    }}
                    onBlur={(e) => {
                        onBlur();
                    }}
                />
            </FormulaInputBox>
        </FlexRow>
    );
}
