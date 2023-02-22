import React from 'react';
import { Close, Copy, EmptyTemplate, IntroImage, IntroLogo, Join, Template1, Template2 } from '../icons/icons';
import {
    Input,
    IntroLeft,
    IntroRight,
    IntroTitle,
    Popover,
    PopoverCard,
    PopoverOverlay,
    PopoverTitle,
    SmallTitle,
    Spacer,
    TemplateButton,
    TopRightPopover,
} from '../styled/Components';
import { appColors } from '../styled/useTheme';
import { FlexRow } from '../styled/Wrappers';
import { Button, ButtonType } from './Button';
import { ToolbarButton } from './ToolbarButton';

interface JoinPopoverProps {
    value: string;
    onJoinClick: () => void;
    onValueChange: (newString: string) => void;
    onClose: () => void;
}

export function JoinPopover({ value, onJoinClick, onValueChange, onClose }: JoinPopoverProps) {
    return (
        <TopRightPopover>
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
        </TopRightPopover>
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
        <TopRightPopover>
            <PopoverHeader label="Choose how you want to share" onClose={onClose} />

            <PopoverContentCard
                icon={<Copy color={appColors.purple.w500} />}
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
        </TopRightPopover>
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

interface InfoPopoverProps {
    activeTemplate: string;
    onClickTemplate: (selectedTemplate: string) => void;
    onClose: () => void;
}

export function InfoPopoverProps({ activeTemplate, onClickTemplate, onClose }: InfoPopoverProps) {
    return (
        <PopoverOverlay>
            <Popover style={{ display: 'flex' }}>
                <IntroLeft>
                    <IntroLogo />
                </IntroLeft>
                <IntroRight>
                    <IntroTitle>Welcome to Farseer Sheets!</IntroTitle>
                    <p>
                        <em>Farseer Sheets</em> is an easy-to-use spreadsheet built for hassle-free collaboration, no
                        accounts required, developed by Farseer.
                    </p>
                    <p>
                        <em>How is it any different?</em>
                    </p>
                    <IntroImage />
                    <p className="small">
                        Unlike other online spreadsheets, your sheet entries and changes are{' '}
                        <em>stored “locally” within your browser’s URL</em>, which means that by sharing the current URL
                        to another person you give them a copy of your sheet.
                    </p>
                    <p className="small">
                        If you want to “be on the same page” with another person, you can invite them to collaborate on
                        your sheet by sharing them a unique access code.
                    </p>
                    <p>
                        <em>Pick a template to start</em>
                    </p>
                    <FlexRow $gap={8}>
                        <TemplateButton $active={activeTemplate === 'empty'} onClick={() => onClickTemplate('empty')}>
                            <EmptyTemplate />
                            <p>Blank Sheet </p>
                        </TemplateButton>
                        <TemplateButton
                            $active={activeTemplate === 'template1'}
                            onClick={() => onClickTemplate('template1')}
                        >
                            <Template1 />
                            <p>Template 1</p>
                        </TemplateButton>
                        <TemplateButton
                            $active={activeTemplate === 'template2'}
                            onClick={() => onClickTemplate('templat2')}
                        >
                            <Template2 />
                            <p>Template 2</p>
                        </TemplateButton>
                    </FlexRow>

                    <div style={{ alignSelf: 'flex-end' }}>
                        <Button type={ButtonType.Primary} label={'Create Sheet'} onClick={onClose} />
                    </div>
                </IntroRight>
            </Popover>
        </PopoverOverlay>
    );
}
