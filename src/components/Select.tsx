import React, { RefObject, useEffect, useRef, useState } from 'react';
import { SelectArrow } from '../icons/icons';
import {
    SelectContainer,
    SelectOption,
    SelectOptions,
    ToolbarButtonBox,
    ToolbarButtonLabel,
} from '../styled/Components';
import { appColors } from '../styled/useTheme';

export interface SelectOption<T> {
    value: T;
    label: string;
}

interface SelectProps<T> {
    placeholder: string;
    disabled?: boolean;
    options: SelectOption<T>[];
    onOptionSelect: (opt: SelectOption<T>) => void;
    onClickClose?: boolean;
    selectedValue: null | T;
}

export function useOnOutClick<TTargetElement extends HTMLElement, TIgnoreElement extends HTMLElement = any>(
    onOutClick: ((e: globalThis.MouseEvent) => void) | (() => void),
    ref?: RefObject<TTargetElement>
) {
    const newTargetRef = useRef<TTargetElement>(null);
    const targetRef = ref ? ref : newTargetRef;
    const ignoreRef = useRef<TIgnoreElement>(null);

    useEffect(() => {
        const outClickHanlder = (e: globalThis.MouseEvent) => {
            const target = e.target as Node;
            if (
                target === targetRef.current ||
                targetRef.current?.isEqualNode(target) ||
                targetRef.current?.contains(target) ||
                target === ignoreRef?.current ||
                ignoreRef?.current?.isEqualNode(target) ||
                ignoreRef?.current?.contains(target)
            ) {
                return;
            }

            onOutClick(e);
        };

        window.addEventListener('click', outClickHanlder, true);
        return () => {
            window.removeEventListener('click', outClickHanlder, true);
        };
    }, [onOutClick, targetRef.current, ignoreRef.current]);

    return [targetRef, ignoreRef] as [RefObject<TTargetElement>, RefObject<TIgnoreElement>];
}

export default function Select<T>({
    placeholder,
    disabled = false,
    options,
    onOptionSelect,
    onClickClose = true,
    selectedValue = null,
}: SelectProps<T>) {
    const [show, setShow] = useState(false);
    const [targetRef] = useOnOutClick<HTMLDivElement>(() => setShow(false));

    const clickHandler = (opt: SelectOption<T>) => {
        onOptionSelect(opt);
        if (onClickClose) {
            setShow(false);
        }
    };

    const activeItem = options.find((opt: SelectOption<T>) => opt.value === selectedValue);
    const label = activeItem ? activeItem.label : placeholder ? placeholder : 'Select';

    return (
        <div ref={targetRef}>
            <SelectContainer>
                <ToolbarButtonBox $active={show} onClick={() => setShow(!show)} style={{ paddingRight: 4 }}>
                    <ToolbarButtonLabel style={{ opacity: activeItem ? 1 : 0.6 }}>{label}</ToolbarButtonLabel>
                    <SelectArrow color={show ? appColors.purple.w500 : appColors.ui.dark} />
                </ToolbarButtonBox>
                {show && (
                    <SelectOptions>
                        {options.map((option, idx) => {
                            return (
                                <SelectOption onClick={() => clickHandler(option)} key={`option-${idx}`}>
                                    {option.label}
                                </SelectOption>
                            );
                        })}
                    </SelectOptions>
                )}
            </SelectContainer>
        </div>
    );
}
