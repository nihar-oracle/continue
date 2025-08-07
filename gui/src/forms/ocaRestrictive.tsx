import React from "react";
import { Button } from "../components";


export const VSC_INPUT_BACKGROUND = "--vscode-input-background"
export const VSC_INPUT_FOREGROUND = "--vscode-input-foreground"
export const VSC_SIDEBAR_BACKGROUND = "--vscode-sideBar-background"
export const VSC_FOREGROUND = "--vscode-foreground"
export const VSC_EDITOR_FOREGROUND = "--vscode-editor-foreground"
export const VSC_FOREGROUND_MUTED = "--vscode-foreground-muted"
export const VSC_DESCRIPTION_FOREGROUND = "--vscode-descriptionForeground"
export const VSC_INPUT_PLACEHOLDER_FOREGROUND = "--vscode-input-placeholderForeground"
export const VSC_BUTTON_BACKGROUND = "--vscode-button-background"
export const VSC_BUTTON_FOREGROUND = "--vscode-button-foreground"
export const VSC_EDITOR_BACKGROUND = "--vscode-editor-background"
export const VSC_LIST_SELECTION_BACKGROUND = "--vscode-list-activeSelectionBackground"
export const VSC_FOCUS_BORDER = "--vscode-focus-border"
export const VSC_LIST_ACTIVE_FOREGROUND = "--vscode-quickInputList-focusForeground"
export const VSC_QUICK_INPUT_BACKGROUND = "--vscode-quickInput-background"
export const VSC_INPUT_BORDER = "--vscode-input-border"
export const VSC_INPUT_BORDER_FOCUS = "--vscode-focusBorder"
export const VSC_BADGE_BACKGROUND = "--vscode-badge-background"
export const VSC_BADGE_FOREGROUND = "--vscode-badge-foreground"
export const VSC_SIDEBAR_BORDER = "--vscode-sideBar-border"
export const VSC_DIFF_REMOVED_LINE_BACKGROUND = "--vscode-diffEditor-removedLineBackground"
export const VSC_DIFF_INSERTED_LINE_BACKGROUND = "--vscode-diffEditor-insertedLineBackground"
export const VSC_INACTIVE_SELECTION_BACKGROUND = "--vscode-editor-inactiveSelectionBackground"
export const VSC_TITLEBAR_INACTIVE_FOREGROUND = "--vscode-titleBar-inactiveForeground"

export function getAsVar(varName: string): string {
	return `var(${varName})`
}

export function hexToRGB(hexColor: string): { r: number; g: number; b: number } {
	const hex = hexColor.replace(/^#/, "").slice(0, 6)
	const [r, g, b] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16))
	return { r, g, b }
}

export function colorToHex(colorVar: string): string {
	const value = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim()
	if (value.startsWith("#")) {
		return value.slice(0, 7)
	}

	const rgbValues = value.match(/\d+/g)?.slice(0, 3).map(Number) || []
	return `#${rgbValues.map((x) => x.toString(16).padStart(2, "0")).join("")}`
}

export const OcaRestrictivePopup: React.FC<{
  onAcknowledge: () => void;
  bannerText?: string | null;
}> = React.memo(({ onAcknowledge, bannerText }) => (
  <div className="fixed top-0 left-0 w-screen h-screen z-[2000] [background:rgba(0,0,0,0.25)] flex items-center justify-center">
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="oca-popup-title"
			className={`p-6 max-w-[600px] w-[90%] rounded-[8px] [box-shadow:0_4px_24px_0_var(--vscode-widget-shadow,rgba(0,0,0,.4))] [border:1px_solid_var(--vscode-focusBorder,#007acc)] [background:var(--vscode-editor-background,#252526)] [color:var(${VSC_FOREGROUND},#cccccc)] [font-family:var(--vscode-font-family,sans-serif)] [font-size:var(--vscode-font-size,13px)] flex flex-col max-h-[80vh]`}>
			<h2 id="oca-popup-title" className={`mt-0 [color:var(${VSC_FOREGROUND},#111)] font-bold`}>
				Acknowledgement Required
			</h2>
			<h4 className={`mb-2 [color:var(${VSC_DESCRIPTION_FOREGROUND},#b3b3b3)] font-semibold`}>
				Disclaimer: Prohibited Data Submission
			</h4>
			<div className="overflow-y-auto flex-1 pr-2 mb-4 text-[13px] leading-[1.5] [color:var(--vscode-foreground,#222)] [mask-image:linear-gradient(to_bottom,black_96%,transparent_100%)]">
				{bannerText && (
					<div
						className={`break-words [background:var(${VSC_INPUT_BACKGROUND},#252526)] [color:var(${VSC_FOREGROUND},#222)]`}
						dangerouslySetInnerHTML={{ __html: bannerText }}
					/>
				)}
			</div>
			<div className="text-right">
				<Button
					type="button"
					onClick={onAcknowledge}
					style={{
						background: `var(${VSC_BUTTON_BACKGROUND}, #0e639c)`,
						color: `var(${VSC_BUTTON_FOREGROUND}, #fff)`,
					}}>
					I acknowledge and agree
				</Button>
			</div>
		</div>
	</div>
));
