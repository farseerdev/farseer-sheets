import React from 'react';
import { Close, Join } from '../icons/icons';
import { Input, Popover, PopoverCard, PopoverTitle, SmallTitle, Spacer } from '../styled/Components';
import { appColors } from '../styled/useTheme';
import { FlexRow } from '../styled/Wrappers';
import { ToolbarButton } from './ToolbarButton';

interface JoinPopoverProps {
    value: string;
    onJoinClick: () => void;
    onValueChange: (newString: string) => void;
    onClose: () => void;
}

export function JoinPopover({ value, onJoinClick, onValueChange, onClose }: JoinPopoverProps) {
    return (
        <Popover>
            <PopoverHeader label="Join" onClose={onClose} />

            <PopoverContentCard
                icon={<Join color={appColors.purple.w500} />}
                title="Join others"
                description="To join someone and collaborate on their sheet, ask them to give you the access code and enter
                        it below."
                value={value}
                onValueChange={onValueChange}
                buttonLabel="Join"
                onButtonClick={onJoinClick}
            />
        </Popover>
    );
}

interface SharePopoverProps {
    copyValue: string;
    onCopyValueClick: () => void;
    onCopyValueChange: (newString: string) => void;
    codeValue: string;
    onCodeValueClick: () => void;
    onCodeValueChange: (newString: string) => void;
    onClose: () => void;
}

export function SharePopover({
    copyValue,
    onCopyValueChange,
    onCopyValueClick,
    codeValue,
    onCodeValueChange,
    onCodeValueClick,
    onClose,
}: SharePopoverProps) {
    return (
        <Popover>
            <PopoverHeader label="Choose how you want to share" onClose={onClose} />

            <PopoverContentCard
                icon={<Join color={appColors.purple.w500} />}
                title="Give others a copy"
                description=" To make a copy of this sheet’s current state, simply copy the current URL and send it to another
                person."
                value={copyValue}
                onValueChange={onCopyValueChange}
                buttonLabel="Copy"
                onButtonClick={onCopyValueClick}
            />

            <PopoverContentCard
                icon={<Join color={appColors.purple.w500} />}
                title="Invite others"
                description="To collaborate on this sheet in real-time, give the code below to another person."
                value={codeValue}
                onValueChange={onCodeValueChange}
                buttonLabel="Copy"
                onButtonClick={onCodeValueClick}
            />
        </Popover>
    );
}

export function PopoverHeader({ label, onClose }: { label: string; onClose: () => void }) {
    return (
        <FlexRow style={{ marginBottom: 20 }}>
            <PopoverTitle>{label}</PopoverTitle>
            <Spacer />
            <ToolbarButton Icon={Close} onClick={onClose} />
        </FlexRow>
    );
}

export function PopoverContentCard({
    icon,
    title,
    description,
    value,
    onValueChange,
    buttonLabel,
    onButtonClick,
}: {
    icon: any;
    title: string;
    description: string;
    value: string;
    onValueChange: (newString: string) => void;
    buttonLabel: string;
    onButtonClick: () => void;
}) {
    return (
        <PopoverCard>
            <IconTitle icon={icon} title={title} />
            <div style={{ paddingLeft: 50, paddingTop: 10, paddingBottom: 20 }}>
                <p>{description}</p>
                <FlexRow $gap={10}>
                    <Input type="text" value={value} onChange={(e) => onValueChange(e.target.value)} />
                    <ToolbarButton label={buttonLabel} onClick={onButtonClick} />
                </FlexRow>
            </div>
        </PopoverCard>
    );
}

export function IconTitle({ icon, title }: any) {
    return (
        <FlexRow $gap={20}>
            {icon}
            <SmallTitle>{title}</SmallTitle>
        </FlexRow>
    );
}
