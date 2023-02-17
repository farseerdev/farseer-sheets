import React, { useEffect, useReducer, useRef, useState } from 'react';
import './App.css';
import Sheet, { Change, Style } from 'sheet-happens';
import 'sheet-happens/dist/index.css';
//@ts-ignore
import numfmt from 'numfmt';
import { compileFormula, tokenize } from './parser';
import { evaluate } from './evaluator';
import { useDebounce } from './utility';
import avro from 'avsc';
import zlib from 'zlib';
import buffer from 'buffer';
import io from 'socket.io-client';
import { generateRandomName } from './generateName';

/*

TODO:
* automatically start server on launch
* full row/col selection + change props
* selection goes back to start when picking cells in formula
* cycle detection
* builtin functions
* cell pointing from formula bar
* multiple selection in sheet-happens

*/

const myName = generateRandomName();

const sheetStateAvroType = avro.Type.forSchema({
    type: 'record',
    name: 'SheetState',
    fields: [
        {
            name: 'version',
            type: 'int',
        },
        {
            name: 'freezeRows',
            type: 'int',
        },
        {
            name: 'freezeColumns',
            type: 'int',
        },
        {
            name: 'hideGridlines',
            type: 'boolean',
        },
        {
            name: 'columnWidth',
            type: { type: 'array', items: 'int' },
        },
        {
            name: 'rowHeight',
            type: { type: 'array', items: 'int' },
        },
        {
            name: 'cells_x',
            type: {
                type: 'array',
                items: 'int',
            },
        },
        {
            name: 'cells_y',
            type: {
                type: 'array',
                items: 'int',
            },
        },
        {
            name: 'cells_dataTypeAndFormula',
            type: {
                type: 'array',
                items: 'int',
            },
        },
        {
            name: 'cells_format',
            type: {
                type: 'array',
                items: 'int',
            },
        },
        {
            name: 'cells_content',
            type: {
                type: 'array',
                items: ['null', 'double', 'string'],
            },
        },
        {
            name: 'cells_style',
            type: {
                type: 'array',
                items: ['int'],
            },
        },
    ],
});

export const DEFAULT_CELL_WIDTH = 100;
export const DEFAULT_CELL_HEIGHT = 22;

const formats = [
    { label: 'General', format: '' },
    { hasNegative: true, example: 124567.89, label: 'Number', format: '#,##0.00' },
    { hasNegative: true, example: 124567.89, label: 'Number', format: '#,##0' },
    { hasNegative: true, example: 124567.89, label: 'Number', format: '#,##0.00;(#,##0.00)' },
    { hasNegative: true, example: 124567.89, label: 'Number', format: '#,##0;(#,##0)' },
    { hasNegative: false, example: 47000, label: 'Date', format: 'dd.mm.yyyy.' },
    { hasNegative: false, example: 47000, label: 'Date', format: 'dd-mm-yyyy.' },
    { hasNegative: false, example: 47000, label: 'Date', format: 'dd/mm/yyyy' },
    { hasNegative: false, example: 47000, label: 'Date', format: 'yyyy.mm.dd.' },
    { hasNegative: false, example: 47000, label: 'Date', format: 'yyyy-mm-dd' },
    { hasNegative: false, example: 47000, label: 'Date', format: 'yyyy/mm/dd' },
    { hasNegative: true, example: 1245.67, label: 'Currency', format: '$#,##0' },
    { hasNegative: true, example: 1245.67, label: 'Currency', format: '$#,##0.00' },
    { hasNegative: true, example: 1245.67, label: 'Currency', format: '$#,##0;($#,##0)' },
    { hasNegative: true, example: 1245.67, label: 'Currency', format: '$#,##0.00;($#,##0.00)' },
    { hasNegative: true, example: 1245.67, label: 'Currency', format: '€#,##0' },
    { hasNegative: true, example: 1245.67, label: 'Currency', format: '€#,##0.00' },
    { hasNegative: true, example: 1245.67, label: 'Currency', format: '€#,##0;(€#,##0)' },
    { hasNegative: true, example: 1245.67, label: 'Currency', format: '€#,##0.00;(€#,##0.00)' },
    { hasNegative: true, example: 0.56, label: 'Percent', format: '#,##0%' },
    { hasNegative: true, example: 0.56, label: 'Percent', format: '#,##0.00%' },
    { hasNegative: true, example: 0.56, label: 'Percent', format: '#,##0%;(#,##0%);' },
    { hasNegative: true, example: 0.56, label: 'Percent', format: '#,##0.00%;(#,##0.00%)' },
];

const enum DataType {
    STRING = 0,
    NUMBER = 1,
}

const enum TextAlign {
    DEFAULT = 0,
    LEFT = 1,
    CENTER = 2,
    RIGHT = 4,
}

const enum TextStyle {
    NORMAL = 0,
    BOLD = 1,
}

interface Cell {
    // serialize
    dataType: DataType;
    formula: boolean;
    content: string | number | null;
    format: number;

    // dont serialize
    value?: string | number | null;
    calculated?: boolean;
    textStyle: TextStyle;
    textAlign: TextAlign;
}

interface PeerData {
    x: number;
    y: number;
    lastUpdated: number;
    color: string;
    active: boolean;
}

function createKey(x: number, y: number) {
    return `${x}_${y}`;
}

function combineDataTypeAndFormula(dataType: DataType, formula: boolean) {
    if (dataType === DataType.NUMBER && !formula) {
        return 0;
    }
    if (dataType === DataType.NUMBER && formula) {
        return 1;
    }
    if (dataType === DataType.STRING && !formula) {
        return 2;
    }
    if (dataType === DataType.STRING && formula) {
        return 3;
    }
    return 4;
}

function serializeSheetState(sheetState: SheetState) {
    const cellarr = Array.from(sheetState.cellMap).map(([k, v]) => ({
        x: Number(k.split('_')[0]),
        y: Number(k.split('_')[1]),
        dataTypeAndFormula: combineDataTypeAndFormula(v.dataType, v.formula),
        format: v.format,
        content: v.content,
        style: packStyleInfo(v.textAlign, v.textStyle),
    }));

    const objForSerialization = {
        freezeRows: sheetState.freezeRows,
        freezeColumns: sheetState.freezeColumns,
        hideGridlines: sheetState.hideGridlines,
        columnWidth: sheetState.columnWidth,
        rowHeight: sheetState.rowHeight,
        cells_x: cellarr.map((c) => c.x),
        cells_y: cellarr.map((c) => c.y),
        cells_dataTypeAndFormula: cellarr.map((c) => c.dataTypeAndFormula),
        cells_format: cellarr.map((c) => c.format),
        cells_content: cellarr.map((c) => c.content),
        cells_style: cellarr.map((c) => c.style),
        version: sheetState.version,
    };

    const buff = sheetStateAvroType.toBuffer(objForSerialization);
    const gzippedBuffer = zlib.gzipSync(buff);
    return gzippedBuffer.toString('base64');
}

function deserializeSheetState(data: string): SheetState {
    const sheetState: SheetState = {
        cellMap: new Map(),
        formulaBarContent: '',
        formulaBarContentChanged: false,
        selection: { x1: -1, y1: -1, x2: -1, y2: -1 },
        selectedCell: null,
        selectedKey: null,
        freezeRows: 0,
        freezeColumns: 0,
        hideGridlines: false,
        columnWidth: [],
        rowHeight: [],
        version: 0,
        multiplayerStatus: 'none',
        myShareCode: 'asdf',
        joinShareCode: '',
    };

    try {
        const buff = buffer.Buffer.from(data, 'base64');
        const buffUnzipped = zlib.unzipSync(buff);

        const deserializedObj = sheetStateAvroType.fromBuffer(buffUnzipped);
        if (!deserializedObj) {
            return sheetState;
        }

        sheetState.freezeRows = deserializedObj.freezeRows;
        sheetState.freezeColumns = deserializedObj.freezeColumns;
        sheetState.hideGridlines = deserializedObj.hideGridlines;
        sheetState.columnWidth = deserializedObj.columnWidth;
        sheetState.rowHeight = deserializedObj.rowHeight;
        sheetState.version = deserializedObj.version;

        const cellCount = deserializedObj.cells_x.length;
        for (let i = 0; i < cellCount; i++) {
            const key = createKey(deserializedObj.cells_x[i], deserializedObj.cells_y[i]);
            const [textAlign, textStyle] = extractStyleInfo(deserializedObj.cells_style[i]);
            sheetState.cellMap.set(key, {
                dataType: deserializedObj.cells_dataTypeAndFormula[i] < 2 ? DataType.NUMBER : DataType.STRING,
                formula:
                    deserializedObj.cells_dataTypeAndFormula[i] === 1 ||
                    deserializedObj.cells_dataTypeAndFormula[i] === 3,
                content: deserializedObj.cells_content[i],
                format: deserializedObj.cells_format[i],
                textStyle,
                textAlign,
            });
        }
    } catch (e) {}

    return sheetState;
}

function convertSelectionToAddress(selection: { x1: number; y1: number; x2: number; y2: number }) {
    if (selection.x1 === selection.x2 && selection.y1 === selection.y2) {
        return convertNumberToExcelLetter(selection.x1 + 1) + (selection.y1 + 1);
    } else {
        return (
            convertNumberToExcelLetter(selection.x1 + 1) +
            (selection.y1 + 1) +
            ':' +
            convertNumberToExcelLetter(selection.x2 + 1) +
            (selection.y2 + 1)
        );
    }
}

function convertNumberToExcelLetter(num: number) {
    var str = '',
        q,
        r;
    while (num > 0) {
        q = (num - 1) / 26;
        r = (num - 1) % 26;
        num = Math.floor(q);
        str = String.fromCharCode(65 + r) + str;
    }
    return str;
}

function convertExcelLetterToColNumber(letters: string) {
    var chrs = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        mode = chrs.length - 1,
        number = 0;
    for (var p = 0; p < letters.length; p++) {
        number = number * mode + chrs.indexOf(letters[p]);
    }
    return number;
}

function parseAddress(address: string): { rowFixed: boolean; row: number; colFixed: boolean; col: number } | null {
    const addressRegexp = /^([$])?([a-zA-Z]+)([$])?(\d+)$/;
    const match = address.match(addressRegexp);
    if (!match) {
        return null;
    }
    const col = convertExcelLetterToColNumber(match[2]);
    const row = Number(match[4]);
    if (isNaN(col) || isNaN(row)) {
        return null;
    }
    const rowFixed = match[1] === '$';
    const colFixed = match[3] === '$';
    return { rowFixed, row: row - 1, colFixed, col: col - 1 };
}

function shiftAddress(address: string, x: number, y: number) {
    const adr = parseAddress(address);
    if (!adr) {
        return address;
    }
    let res = '';
    if (adr.colFixed) {
        res += '$' + convertNumberToExcelLetter(adr.col + 1);
    } else {
        res += convertNumberToExcelLetter(adr.col + 1 + x);
    }
    if (adr.rowFixed) {
        res += '$' + (adr.row + 1);
    } else {
        res += adr.row + 1 + y;
    }
    return res;
}

function shiftAddressOrRange(address: string, x: number, y: number) {
    if (address.includes(':')) {
        const splat = address.split(':');
        return shiftAddress(splat[0], x, y) + ':' + shiftAddress(splat[1], x, y);
    } else {
        return shiftAddress(address, x, y);
    }
}

function applyShiftToFormula(formula: string, x: number, y: number) {
    const tokens = tokenize(formula);
    let correctedContent = '';
    for (const tok of tokens) {
        if (tok.tokenType.name === 'CellAddress' || tok.tokenType.name === 'CellAddressRange') {
            correctedContent += shiftAddressOrRange(tok.image, x, y);
        } else {
            correctedContent += tok.image;
        }
    }

    return correctedContent;
}

function getLoader(data: Map<string, Cell>) {
    return function ldr(address: string) {
        if (address.includes(':')) {
            const splat = address.split(':');
            const addressFrom = parseAddress(splat[0]);
            const addressTo = parseAddress(splat[1]);
            if (addressFrom === null || addressTo === null) {
                throw new Error('#REF!');
            }
            const values: (number | string | null)[][] = [];
            for (let y = addressFrom.row; y <= addressTo.row; y++) {
                const valuesRow: (number | string | null)[] = [];
                for (let x = addressFrom.col; x <= addressTo.col; x++) {
                    const key = createKey(x, y);
                    const cell = data.get(key);
                    if (cell) {
                        if (cell.formula && !cell.calculated) {
                            evaluateCell(data, key, cell, ldr);
                        }
                        valuesRow.push(cell.value || null);
                    } else {
                        valuesRow.push(null);
                    }
                }
                values.push(valuesRow);
            }
            return values;
        } else {
            const res = parseAddress(address);
            if (res === null) {
                throw new Error('#REF!');
            }
            const key = createKey(res.col, res.row);
            const cell = data.get(key);
            if (cell) {
                if (cell.formula && !cell.calculated) {
                    evaluateCell(data, key, cell, ldr);
                }
                if (cell.value === undefined) {
                    //throw new Error('Cell value undefined');
                    return null;
                }
                return cell.value;
            }
            return null;
        }
    };
}

function evaluateCell(
    data: Map<string, Cell>,
    cellKey: string,
    cell: Cell,
    loader: (address: string) => number | string | null | (number | string | null)[][]
) {
    //console.log('-> Evaluating cell:', cellKey);
    const instr = compileFormula((cell.content as string).substring(1));
    if (instr.length > 0) {
        try {
            const result = evaluate(instr, loader);
            if (typeof result === 'number') {
                cell.dataType = DataType.NUMBER;
            } else {
                cell.dataType = DataType.STRING;
            }
            cell.value = result;
        } catch (e) {
            cell.dataType = DataType.STRING;
            cell.value = '#ERROR!';
        }
    } else {
        cell.dataType = DataType.STRING;
        cell.value = '';
    }
    //console.log('-> DONE Evaluating cell:', cellKey);
    cell.calculated = true;
}

function calculate(data: Map<string, Cell>) {
    const loader = getLoader(data);
    for (const [, cell] of data) {
        cell.calculated = false;
    }
    for (const [key, cell] of data) {
        if (cell.formula) {
            if (!cell.calculated) {
                evaluateCell(data, key, cell, loader);
            }
        } else {
            cell.value = cell.content;
        }
    }
}

function extractStyleInfo(style: number): [TextAlign, TextStyle] {
    const ta = (style >> 1) & 0x7;
    const textAlign: TextAlign =
        ta === 1 ? TextAlign.LEFT : ta === 2 ? TextAlign.CENTER : ta === 4 ? TextAlign.RIGHT : TextAlign.DEFAULT;

    const ts = style & 0x1;
    const textStyle = ts === 1 ? TextStyle.BOLD : TextStyle.NORMAL;

    return [textAlign, textStyle];
}

function packStyleInfo(textAlign: TextAlign, textStyle: TextStyle) {
    return (textAlign << 1) | textStyle;
}

interface SheetState {
    cellMap: Map<string, Cell>;
    formulaBarContent: string;
    formulaBarContentChanged: boolean;
    selection: { x1: number; y1: number; x2: number; y2: number };
    selectedCell: Cell | null;
    selectedKey: string | null;
    freezeRows: number;
    freezeColumns: number;
    hideGridlines: boolean;
    columnWidth: number[];
    rowHeight: number[];
    version: number;
    multiplayerStatus: 'none' | 'server' | 'client';
    joinShareCode: string;
    myShareCode: string;
}

const enum SheetActionType {
    CHANGE_SHEET_VALUES = 'CHANGE_SHEET_VALUES',
    TOGGLE_GRIDLINES = 'TOGGLE_GRIDLINES',
    UNDO = 'UNDO',
    REDO = 'REDO',
    UPDATE_SELECTION = 'UPDATE_SELECTION',
    UPDATE_FORMULA_BAR_CONTENT = 'UPDATE_FORMULA_BAR_CONTENT',
    COMMIT_FORMULA_BAR = 'COMMIT_FORMULA_BAR',
    DISCARD_FORMULA_BAR = 'DISCARD_FORMULA_BAR',
    SET_FORMAT_FOR_SELECTED_CELLS = 'SET_FORMAT_FOR_SELECTED_CELLS',
    SET_DATA_TYPE_FOR_SELECTED_CELLS = 'SET_DATA_TYPE_FOR_SELECTED_CELLS',
    SET_FREEZE_ROWS = 'SET_FREEZE_ROWS',
    SET_FREEZE_COLUMNS = 'SET_FREEZE_COLUMNS',
    UPDATE_STATE_FROM_URL = 'UPDATE_STATE_FROM_URL',
    SET_ROW_HEIGHTS = 'SET_ROW_HEIGHTS',
    SET_COLUMN_WIDTHS = 'SET_COLUMN_WIDTHS',
    UPDATE_STATE_FROM_STRING = 'UPDATE_STATE_FROM_STRING',
    SET_STYLE = 'SET_STYLE',
    SET_MULTIPLAYER_STATUS = 'SET_MULTIPLAYER_STATUS',
    UPDATE_JOIN_SHARE_CODE = 'UPDATE_JOIN_SHARE_CODE',
}

const actionTypesToSend = new Set([
    SheetActionType.CHANGE_SHEET_VALUES,
    SheetActionType.TOGGLE_GRIDLINES,
    SheetActionType.UNDO,
    SheetActionType.REDO,
    SheetActionType.UPDATE_SELECTION,
    SheetActionType.COMMIT_FORMULA_BAR,
    SheetActionType.SET_FORMAT_FOR_SELECTED_CELLS,
    SheetActionType.SET_DATA_TYPE_FOR_SELECTED_CELLS,
    SheetActionType.SET_FREEZE_ROWS,
    SheetActionType.SET_FREEZE_COLUMNS,
    SheetActionType.SET_ROW_HEIGHTS,
    SheetActionType.SET_COLUMN_WIDTHS,
    SheetActionType.SET_STYLE,
]);

interface SetUpdateJoinShareCode {
    type: SheetActionType.UPDATE_JOIN_SHARE_CODE;
    code: string;
}
interface SetMultiplayerStatusAction {
    type: SheetActionType.SET_MULTIPLAYER_STATUS;
    status: 'none' | 'client' | 'server';
}

interface SetStyleAction {
    type: SheetActionType.SET_STYLE;
    textAlign?: TextAlign;
    textStyle?: TextStyle;
}

interface UpdateStateFromStringAction {
    type: SheetActionType.UPDATE_STATE_FROM_STRING;
    data: string;
}
interface SetColumnWidthsAction {
    type: SheetActionType.SET_COLUMN_WIDTHS;
    widths: number[];
}

interface SetRowHeightsAction {
    type: SheetActionType.SET_ROW_HEIGHTS;
    heights: number[];
}

interface UpdateStateFromUrlAction {
    type: SheetActionType.UPDATE_STATE_FROM_URL;
}
interface SetFreezeColumnsAction {
    type: SheetActionType.SET_FREEZE_COLUMNS;
    freezeColumns: number;
}
interface SetFreezeRowsAction {
    type: SheetActionType.SET_FREEZE_ROWS;
    freezeRows: number;
}
interface SetDataTypeForSelectedCellsAction {
    type: SheetActionType.SET_DATA_TYPE_FOR_SELECTED_CELLS;
    dataType: DataType;
}
interface SetFormatForSelectedCellsAction {
    type: SheetActionType.SET_FORMAT_FOR_SELECTED_CELLS;
    formatId: number;
}
interface DiscardFormulaBarAction {
    type: SheetActionType.DISCARD_FORMULA_BAR;
}

interface CommitFormulaBarAction {
    type: SheetActionType.COMMIT_FORMULA_BAR;
}
interface UpdateFormulaBarContentAction {
    type: SheetActionType.UPDATE_FORMULA_BAR_CONTENT;
    value: string;
}
interface UpdateSelectionAction {
    type: SheetActionType.UPDATE_SELECTION;
    selection: { x1: number; y1: number; x2: number; y2: number };
}
interface UndoAction {
    type: SheetActionType.UNDO;
}
interface RedoAction {
    type: SheetActionType.REDO;
}
interface ToggleGridlinesAction {
    type: SheetActionType.TOGGLE_GRIDLINES;
    hideGridlines: boolean;
}
interface ChangeSheetValueAction {
    type: SheetActionType.CHANGE_SHEET_VALUES;
    changes: Change[];
}

type SheetAction = (
    | ChangeSheetValueAction
    | ToggleGridlinesAction
    | UndoAction
    | RedoAction
    | UpdateSelectionAction
    | UpdateFormulaBarContentAction
    | CommitFormulaBarAction
    | SetFormatForSelectedCellsAction
    | SetDataTypeForSelectedCellsAction
    | SetFreezeColumnsAction
    | SetFreezeRowsAction
    | UpdateStateFromUrlAction
    | DiscardFormulaBarAction
    | SetColumnWidthsAction
    | SetRowHeightsAction
    | UpdateStateFromStringAction
    | SetStyleAction
    | SetMultiplayerStatusAction
    | SetUpdateJoinShareCode
) & { fromSocket?: boolean };

function createCell(content: string | number, oldCell?: Cell): Cell {
    let dataType: DataType = DataType.STRING;
    let formula = false;
    let textAlign = oldCell?.textAlign ?? TextAlign.DEFAULT;
    if (typeof content === 'string') {
        if (content.startsWith('=') && content.length > 1) {
            formula = true;
        } else {
            const num = Number(content);
            if (!isNaN(num)) {
                content = num;
                dataType = DataType.NUMBER;
            }
        }
    } else if (typeof content === 'number') {
        dataType = DataType.NUMBER;
    }

    return {
        content: content,
        value: content,
        dataType: dataType,
        formula,
        format: oldCell?.format ?? 0,
        textAlign,
        textStyle: oldCell?.textStyle ?? TextStyle.NORMAL,
    };
}

function updateUrl(sheetState: SheetState) {
    const e = new Error();
    const url = new URL(window.location as any);
    const serialized = serializeSheetState(sheetState);
    //console.log('Data length:', serialized.length);
    url.searchParams.set('d', serialized);
    window.history.pushState({}, '', url);
}

function findMinMaxRowCol(cellMap: Map<string, Cell>) {
    const res = {};
}

function iterateOverSelected(
    cellMap: Map<string, Cell>,
    selection: { x1: number; y1: number; x2: number; y2: number },
    cb: (cell: Cell) => void
) {
    if (selection.x1 === -1 && selection.y1 === -1 && selection.x2 === -1 && selection.y2 === -1) {
        return;
    }

    if (selection.x1 === -1 && selection.x2 === -1 && selection.y1 !== -1 && selection.y2 !== -1) {
        for (let y = selection.y1; y <= selection.y2; y++) {}
    }

    for (let x = selection.x1; x <= selection.x2; x++) {
        for (let y = selection.y1; y <= selection.y2; y++) {}
    }
}

function sheetReducer(state: SheetState, action: SheetAction) {
    let newState: SheetState = { ...state, version: state.version + 1 };
    switch (action.type) {
        case SheetActionType.CHANGE_SHEET_VALUES: {
            const newCellMap = new Map(newState.cellMap);
            for (const change of action.changes) {
                const key = createKey(change.x, change.y);
                if (change.value === null || change.value === '') {
                    newCellMap.delete(key);
                    if (newState.selectedKey === key) {
                        newState.selectedKey = null;
                        newState.selectedCell = null;
                        newState.formulaBarContent = '';
                        newState.formulaBarContentChanged = false;
                    }
                    continue;
                }
                const oldCell = newState.cellMap.get(key);
                const cell = createCell(change.value, oldCell);
                if (change.source) {
                    const sourceCell = newCellMap.get(createKey(change.source.x, change.source.y));
                    if (sourceCell) {
                        cell.format = sourceCell.format;
                        cell.dataType = sourceCell.dataType;
                        cell.textAlign = sourceCell.textAlign;
                        cell.textStyle = sourceCell.textStyle;
                        if (typeof cell.content === 'string') {
                            cell.content = applyShiftToFormula(
                                cell.content,
                                change.x - change.source.x,
                                change.y - change.source.y
                            );
                        } else if (typeof cell.content === 'number') {
                            cell.content += Math.max(change.x - change.source.x, change.y - change.source.y);
                        }
                    }
                }
                newCellMap.set(key, cell);
            }
            calculate(newCellMap);
            newState.cellMap = newCellMap;

            updateUrl(newState);
            break;
        }
        case SheetActionType.TOGGLE_GRIDLINES: {
            newState.hideGridlines = action.hideGridlines;
            updateUrl(newState);
            break;
        }
        case SheetActionType.UNDO: {
            break;
        }
        case SheetActionType.REDO: {
            break;
        }
        case SheetActionType.SET_ROW_HEIGHTS: {
            newState.rowHeight = action.heights;
            updateUrl(newState);
            break;
        }
        case SheetActionType.SET_COLUMN_WIDTHS: {
            newState.columnWidth = action.widths;
            updateUrl(newState);
            break;
        }
        case SheetActionType.UPDATE_SELECTION: {
            newState.selection = action.selection;
            const key = createKey(newState.selection.x1, newState.selection.y1);
            const cell = newState.cellMap.get(key);
            if (cell) {
                newState.selectedCell = cell;
                newState.selectedKey = key;
                newState.formulaBarContent = '' + cell.content;
                newState.formulaBarContentChanged = false;
            } else {
                newState.selectedCell = null;
                newState.selectedKey = null;
                newState.formulaBarContent = '';
                newState.formulaBarContentChanged = false;
            }

            break;
        }
        case SheetActionType.UPDATE_FORMULA_BAR_CONTENT: {
            newState.formulaBarContent = action.value;
            newState.formulaBarContentChanged = true;
            break;
        }
        case SheetActionType.COMMIT_FORMULA_BAR: {
            if (newState.formulaBarContentChanged) {
                const newCellMap = new Map(newState.cellMap);
                if (newState.selectedKey) {
                    // edit cell
                    if (newState.formulaBarContent === '') {
                        newCellMap.delete(newState.selectedKey);
                        newState.selectedCell = null;
                        newState.selectedKey = null;
                    } else {
                        const cell = createCell(newState.formulaBarContent);
                        newCellMap.set(newState.selectedKey, cell);
                        newState.selectedCell = cell;
                    }
                } else {
                    //create cell
                    if (
                        newState.formulaBarContent !== '' &&
                        newState.selection.x1 !== -1 &&
                        newState.selection.y1 !== -1
                    ) {
                        const key = createKey(newState.selection.x1, newState.selection.y1);
                        newCellMap.set(key, createCell(newState.formulaBarContent));
                    }
                }
                calculate(newCellMap);
                newState.cellMap = newCellMap;
                updateUrl(newState);
            }
            break;
        }
        case SheetActionType.DISCARD_FORMULA_BAR: {
            if (newState.selectedCell) {
                newState.formulaBarContent = '' + newState.selectedCell.content;
            } else {
                newState.formulaBarContent = '';
            }
            newState.formulaBarContentChanged = false;
            break;
        }
        case SheetActionType.SET_FORMAT_FOR_SELECTED_CELLS: {
            if (
                newState.selection.x1 !== -1 &&
                newState.selection.y1 !== -1 &&
                newState.selection.x2 !== -1 &&
                newState.selection.y2 !== -1
            ) {
                const newCellMap = new Map(newState.cellMap);
                for (let x = newState.selection.x1; x <= newState.selection.x2; x++) {
                    for (let y = newState.selection.y1; y <= newState.selection.y2; y++) {
                        const key = createKey(x, y);
                        const cell = newCellMap.get(key);
                        if (cell) {
                            const newCell: Cell = {
                                ...cell,
                                format: action.formatId,
                            };
                            newCellMap.set(key, newCell);
                        }
                    }
                }
                if (newState.selectedKey !== null) {
                    const selectedCell = newCellMap.get(newState.selectedKey);
                    if (selectedCell) {
                        newState.selectedCell = selectedCell;
                    }
                }
                newState.cellMap = newCellMap;
                calculate(newState.cellMap);
                updateUrl(newState);
            }
            break;
        }
        case SheetActionType.SET_DATA_TYPE_FOR_SELECTED_CELLS: {
            if (
                newState.selection.x1 !== -1 &&
                newState.selection.y1 !== -1 &&
                newState.selection.x2 !== -1 &&
                newState.selection.y2 !== -1
            ) {
                const newCellMap = new Map(newState.cellMap);
                for (let x = newState.selection.x1; x <= newState.selection.x2; x++) {
                    for (let y = newState.selection.y1; y <= newState.selection.y2; y++) {
                        const key = createKey(x, y);
                        const cell = newCellMap.get(key);
                        if (cell) {
                            const newCell: Cell = {
                                ...cell,
                                dataType: action.dataType,
                            };
                            newCellMap.set(key, newCell);
                        }
                    }
                }
                if (newState.selectedKey !== null) {
                    const selectedCell = newCellMap.get(newState.selectedKey);
                    if (selectedCell) {
                        newState.selectedCell = selectedCell;
                    }
                }
                newState.cellMap = newCellMap;
                calculate(newState.cellMap);
                updateUrl(newState);
            }

            break;
        }
        case SheetActionType.SET_FREEZE_COLUMNS: {
            if (!isNaN(action.freezeColumns)) {
                newState.freezeColumns = action.freezeColumns;
                updateUrl(newState);
            }
            break;
        }
        case SheetActionType.SET_FREEZE_ROWS: {
            if (!isNaN(action.freezeRows)) {
                newState.freezeRows = action.freezeRows;
                updateUrl(newState);
            }
            break;
        }
        case SheetActionType.UPDATE_STATE_FROM_URL: {
            const url = new URL(window.location.href);
            const searchParams = url.searchParams;
            const data = searchParams.get('d') || '';
            newState = deserializeSheetState(data);
            calculate(newState.cellMap);
            break;
        }
        case SheetActionType.UPDATE_STATE_FROM_STRING: {
            const deser = deserializeSheetState(action.data);
            newState = {
                cellMap: deser.cellMap,
                formulaBarContent: state.formulaBarContent,
                formulaBarContentChanged: state.formulaBarContentChanged,
                selection: state.selection,
                selectedCell: null,
                selectedKey: null,
                freezeRows: deser.freezeRows,
                freezeColumns: deser.freezeColumns,
                hideGridlines: deser.hideGridlines,
                columnWidth: deser.columnWidth,
                rowHeight: deser.rowHeight,
                version: deser.version,
                multiplayerStatus: state.multiplayerStatus,
                joinShareCode: state.joinShareCode,
                myShareCode: state.myShareCode,
            };
            calculate(newState.cellMap);
            const key = createKey(newState.selection.x1, newState.selection.y1);
            const cell = newState.cellMap.get(key);
            if (cell) {
                newState.selectedCell = cell;
                newState.selectedKey = key;
                newState.formulaBarContent = '' + cell.content;
                newState.formulaBarContentChanged = false;
            } else {
                newState.selectedCell = null;
                newState.selectedKey = null;
                newState.formulaBarContent = '';
                newState.formulaBarContentChanged = false;
            }
            break;
        }
        case SheetActionType.SET_STYLE: {
            if (
                newState.selection.x1 !== -1 &&
                newState.selection.y1 !== -1 &&
                newState.selection.x2 !== -1 &&
                newState.selection.y2 !== -1
            ) {
                const newCellMap = new Map(newState.cellMap);
                for (let x = newState.selection.x1; x <= newState.selection.x2; x++) {
                    for (let y = newState.selection.y1; y <= newState.selection.y2; y++) {
                        const key = createKey(x, y);
                        const cell = newCellMap.get(key);
                        if (cell) {
                            const newCell: Cell = {
                                ...cell,
                            };
                            if (action.textAlign !== undefined) {
                                newCell.textAlign = action.textAlign;
                            }
                            if (action.textStyle !== undefined) {
                                newCell.textStyle = action.textStyle;
                            }

                            newCellMap.set(key, newCell);
                        }
                    }
                }
                if (newState.selectedKey !== null) {
                    const selectedCell = newCellMap.get(newState.selectedKey);
                    if (selectedCell) {
                        newState.selectedCell = selectedCell;
                    }
                }
                newState.cellMap = newCellMap;
                calculate(newState.cellMap);
                updateUrl(newState);
            }
            break;
        }
        case SheetActionType.SET_MULTIPLAYER_STATUS: {
            newState.multiplayerStatus = action.status;
            break;
        }
        case SheetActionType.UPDATE_JOIN_SHARE_CODE: {
            newState.joinShareCode = action.code;
            break;
        }
    }

    //console.log('act: ', action.type, ' status:', newState.multiplayerStatus, ' old: ', state.multiplayerStatus);

    if (!action.fromSocket && newState.multiplayerStatus !== 'none' && actionTypesToSend.has(action.type)) {
        const shareCode = newState.multiplayerStatus === 'client' ? newState.joinShareCode : newState.myShareCode;
        socketSync({
            command: SocketCommandType.ACTION_SOCKET_COMMAND,
            peerId: myName,
            action,
            shareCode,
        });
    }

    return newState;
}

function createInitalSheetState(): SheetState {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const data = searchParams.get('d') || '';
    const sheetState = deserializeSheetState(data);
    calculate(sheetState.cellMap);
    return sheetState;
}

function useSheetData() {
    const [sheetState, dispatch] = useReducer(sheetReducer, {}, createInitalSheetState);

    useEffect(() => {
        function onBack() {
            dispatch({ type: SheetActionType.UPDATE_STATE_FROM_URL });
        }
        window.addEventListener('popstate', onBack);
        return () => {
            window.removeEventListener('popstate', onBack);
        };
    }, []);

    const displayData = (x: number, y: number) => {
        const key = createKey(x, y);
        const cell = sheetState.cellMap.get(key);
        if (cell && cell.value !== undefined) {
            if (typeof cell.value === 'number') {
                return numfmt.format(formats[cell.format].format, cell.value);
            }
            return cell.value;
        }
        return null;
    };
    const editData = (x: number, y: number) => {
        const key = createKey(x, y);
        const cell = sheetState.cellMap.get(key);
        if (cell && cell.content !== null) {
            return '' + cell.content;
        }
        return '';
    };
    const sourceData = (x: number, y: number) => {
        const key = createKey(x, y);
        const cell = sheetState.cellMap.get(key);
        if (cell) {
            return cell.content;
        }
        return null;
    };

    const cellStyle = (x: number, y: number): Style => {
        const key = createKey(x, y);
        const cell = sheetState.cellMap.get(key);
        let style: Style = {};
        if (cell) {
            if (cell.textAlign === TextAlign.CENTER) {
                style.textAlign = 'center';
            } else if (cell.textAlign === TextAlign.RIGHT) {
                style.textAlign = 'right';
            } else if (cell.textAlign === TextAlign.LEFT) {
                style.textAlign = 'left';
            } else {
                if (cell.dataType === DataType.NUMBER) {
                    style.textAlign = 'right';
                } else {
                    style.textAlign = 'left';
                }
            }
            if (cell.textStyle === TextStyle.BOLD) {
                style.weight = 'bold';
            }
        }
        return style;
    };

    return {
        displayData,
        editData,
        sourceData,
        cellStyle,
        sheetState,
        dispatch,
    };
}

const socket = io('https://spreadsheet-server-x5gpvfmeoa-ew.a.run.app');

const enum SocketCommandType {
    REQUEST_DATA_SOCKET_COMMAND = 'REQUEST_DATA_SOCKET_COMMAND',
    FULL_DATA_SOCKET_COMMAND = 'FULL_DATA_SOCKET_COMMAND',
    POINTER_SYNC_SOCKET_COMMAND = 'POINTER_SYNC_SOCKET_COMMAND',
    ACTION_SOCKET_COMMAND = 'ACTION_SOCKET_COMMAND',
}

interface RequestDataSocketCommand {
    command: SocketCommandType.REQUEST_DATA_SOCKET_COMMAND;
}
interface FullDataSocketCommand {
    command: SocketCommandType.FULL_DATA_SOCKET_COMMAND;
    data: string;
}

interface PointerSyncSocketCommand {
    command: SocketCommandType.POINTER_SYNC_SOCKET_COMMAND;
    peerId: string;
    x: number;
    y: number;
}
interface ActionSocketCommand {
    command: SocketCommandType.ACTION_SOCKET_COMMAND;
    peerId: string;
    action: SheetAction;
}

type SocketCommand = (
    | RequestDataSocketCommand
    | FullDataSocketCommand
    | PointerSyncSocketCommand
    | ActionSocketCommand
) & {
    shareCode: string;
};

function socketSync(command: SocketCommand) {
    //console.log('sending', command.command, ' to ', command.shareCode);
    socket.emit('sync', command);
}

function socketJoin(shareCode: string) {
    socket.emit('join', { shareCode });
}

function App() {
    const { displayData, sourceData, editData, cellStyle, sheetState, dispatch } = useSheetData();
    const [pointerMap, setPointerMap] = useState(new Map<string, PeerData>());

    useEffect(() => {
        function onSync(data: any) {
            const command = data as SocketCommand;
            switch (command.command) {
                case SocketCommandType.REQUEST_DATA_SOCKET_COMMAND: {
                    // someone requested data
                    console.log('got request data from someone', sheetState.multiplayerStatus);
                    if (sheetState.multiplayerStatus === 'server') {
                        console.log('sending back the data');
                        socketSync({
                            command: SocketCommandType.FULL_DATA_SOCKET_COMMAND,
                            shareCode: sheetState.myShareCode,
                            data: serializeSheetState(sheetState),
                        });
                    }
                    break;
                }
                case SocketCommandType.FULL_DATA_SOCKET_COMMAND: {
                    // we got full data after we requested it
                    console.log('got full data from server', sheetState.multiplayerStatus);
                    if (sheetState.multiplayerStatus === 'client') {
                        dispatch({
                            type: SheetActionType.UPDATE_STATE_FROM_STRING,
                            data: command.data,
                            fromSocket: true,
                        });
                    }
                    break;
                }
                case SocketCommandType.ACTION_SOCKET_COMMAND: {
                    // we got action from another player
                    if (sheetState.multiplayerStatus === 'client' || sheetState.multiplayerStatus === 'server') {
                        command.action.fromSocket = true;
                        dispatch(command.action);
                    }
                    break;
                }
                case SocketCommandType.POINTER_SYNC_SOCKET_COMMAND: {
                    setPointerMap((old) => {
                        const newMap = new Map(old);
                        const oldEntry = newMap.get(command.peerId);
                        if (oldEntry) {
                            oldEntry.x = command.x;
                            oldEntry.y = command.y;
                            oldEntry.active = true;
                        } else {
                            newMap.set(command.peerId, {
                                x: command.x,
                                y: command.y,
                                lastUpdated: Date.now(),
                                color: '#' + ((Math.random() * 0xffffff) << 0).toString(16),
                                active: true,
                            });
                        }
                        return newMap;
                    });

                    break;
                }
            }
        }

        socket.on('sync', onSync);
        return () => {
            socket.off('sync', onSync);
        };
    }, [sheetState]);

    const onJoinButtonClick = () => {
        if (sheetState.joinShareCode !== '') {
            console.log('joining:', sheetState.joinShareCode);
            // we are now client
            dispatch({ type: SheetActionType.SET_MULTIPLAYER_STATUS, status: 'client' });
            // first join to room
            socketJoin(sheetState.joinShareCode);
            // request data after giving some time to server to join us
            setTimeout(() => {
                socketSync({
                    command: SocketCommandType.REQUEST_DATA_SOCKET_COMMAND,
                    shareCode: sheetState.joinShareCode,
                });
            }, 100);
        }
    };

    const onStartServerClick = () => {
        console.log('starting server with code:', sheetState.myShareCode);
        dispatch({ type: SheetActionType.SET_MULTIPLAYER_STATUS, status: 'server' });
        socketJoin(sheetState.myShareCode);
    };

    const [cellWidth, setCellWidth] = useState<number[]>(sheetState.columnWidth);
    const [cellHeight, setCellHeight] = useState<number[]>(sheetState.rowHeight);
    const [dontCommitEditOnSelectionChange, setDontCommitEditOnSelectionChange] = useState(false);
    const sheetInputRef = useRef<HTMLInputElement>(null);
    const sheetInputOnChangeRef = useRef<null | ((value: string) => void)>(null);

    const onSelectionChanged = (x1: number, y1: number, x2: number, y2: number) => {
        // if there is something in a formula bar, we need to save it on selection change
        dispatch({ type: SheetActionType.COMMIT_FORMULA_BAR });

        dispatch({
            type: SheetActionType.UPDATE_SELECTION,
            selection: {
                x1,
                y1,
                x2,
                y2,
            },
        });

        // logic for selecting cell while typing the formula
        setTimeout(() => {
            if (
                sheetInputRef.current &&
                sheetInputOnChangeRef.current &&
                sheetInputRef.current.value.charAt(0) === '='
            ) {
                // parse
                const tokens = tokenize(sheetInputRef.current.value.substring(1));
                let newText = '';
                const address = convertSelectionToAddress({ x1, y1, x2, y2 });

                if (tokens.length > 0) {
                    const lastToken = tokens[tokens.length - 1];
                    let tokenCount = tokens.length;
                    if (lastToken.tokenType.name === 'CellAddress' || lastToken.tokenType.name === 'CellAddressRange') {
                        tokenCount = tokens.length - 1;
                    }
                    for (let i = 0; i < tokenCount; i++) {
                        newText += tokens[i].image;
                    }
                }

                const newContent = `=${newText}${address}`;
                sheetInputOnChangeRef.current(newContent);
                sheetInputRef.current.setSelectionRange(newContent.length, newContent.length);
                sheetInputRef.current.focus();
            }
        }, 0);
    };

    const onChange = async (changes: Change[]) => {
        dispatch({ type: SheetActionType.CHANGE_SHEET_VALUES, changes });
    };

    const onCellWidthChange = (indices: number[], newWidth: number) => {
        const cw = [...cellWidth];
        for (const columnIdx of indices) {
            if (columnIdx > cw.length) {
                for (let i = cw.length; i <= columnIdx; i++) {
                    cw.push(DEFAULT_CELL_WIDTH);
                }
            }
            cw[columnIdx] = newWidth;
        }
        setCellWidth(cw);
    };

    const onCellHeightChange = (indices: number[], newHeight: number) => {
        const ch = [...cellHeight];
        for (const rowIdx of indices) {
            if (rowIdx > ch.length) {
                for (let i = ch.length; i <= rowIdx; i++) {
                    ch.push(DEFAULT_CELL_HEIGHT);
                }
            }
            ch[rowIdx] = newHeight;
        }
        setCellHeight(ch);
    };

    const debouncedCellWidth = useDebounce(cellWidth, 200);
    const debouncedCellHeight = useDebounce(cellHeight, 200);

    useEffect(() => {
        dispatch({ type: SheetActionType.SET_ROW_HEIGHTS, heights: debouncedCellHeight });
    }, [JSON.stringify(debouncedCellHeight)]);

    useEffect(() => {
        dispatch({ type: SheetActionType.SET_COLUMN_WIDTHS, widths: debouncedCellWidth });
    }, [JSON.stringify(debouncedCellWidth)]);

    useEffect(() => {
        setCellWidth(sheetState.columnWidth);
        setCellHeight(sheetState.rowHeight);
    }, [sheetState]);

    const onMouseMove = (x: number, y: number) => {
        if (sheetState.multiplayerStatus === 'none') {
            return;
        }
        const shareCode = sheetState.multiplayerStatus === 'client' ? sheetState.joinShareCode : sheetState.myShareCode;
        socketSync({
            command: SocketCommandType.POINTER_SYNC_SOCKET_COMMAND,
            peerId: myName,
            x,
            y,
            shareCode,
        });
    };

    // clear old pointer data
    useEffect(() => {
        const handle = setInterval(() => {
            const newPointerMap = new Map(pointerMap);
            for (const [k, v] of newPointerMap) {
                if (Date.now() - v.lastUpdated > 3000) {
                    v.active = false;
                }
            }
            setPointerMap(newPointerMap);
        }, 1000);
        return () => {
            clearInterval(handle);
        };
    }, [pointerMap]);

    return (
        <div
            className="App"
            onMouseMove={(e) => {
                onMouseMove(e.clientX, e.clientY);
            }}
        >
            <div>
                Toolbar Data type:
                <select
                    disabled={sheetState.selectedCell === null}
                    value={sheetState.selectedCell ? sheetState.selectedCell?.dataType.toString() : 'none'}
                    onChange={(e) => {
                        if (e.target.value === 'none') {
                            return;
                        }
                        dispatch({
                            type: SheetActionType.SET_DATA_TYPE_FOR_SELECTED_CELLS,
                            dataType: Number(e.target.value) as DataType,
                        });
                    }}
                >
                    <option value="none">None</option>
                    <option value={'' + DataType.STRING}>String</option>
                    <option value={'' + DataType.NUMBER}>Number</option>
                </select>
                Format:
                <select
                    disabled={sheetState.selectedCell === null}
                    value={sheetState.selectedCell?.format || ''}
                    onChange={(e) =>
                        dispatch({
                            type: SheetActionType.SET_FORMAT_FOR_SELECTED_CELLS,
                            formatId: Number(e.target.value),
                        })
                    }
                >
                    {formats.map((format, index) => {
                        let label = format.label;
                        if (format.example !== undefined) {
                            label += `____ Example: ${numfmt.format(format.format, format.example)}`;
                        }
                        if (format.hasNegative !== undefined) {
                            label += ' ' + numfmt.format(format.format, -format.example);
                        }
                        return (
                            <option key={`format-option-${index}`} value={index}>
                                {label}
                            </option>
                        );
                    })}
                </select>
                Freeze rows:
                <select
                    value={'' + sheetState.freezeRows}
                    onChange={(e) =>
                        dispatch({ type: SheetActionType.SET_FREEZE_ROWS, freezeRows: Number(e.target.value) })
                    }
                >
                    <option value="0">No freeze</option>
                    <option value="1">Freeze 1 row</option>
                    <option value="2">Freeze 2 rows</option>
                    <option value="3">Freeze 3 rows</option>
                </select>
                Freeze colums:
                <select
                    value={'' + sheetState.freezeColumns}
                    onChange={(e) =>
                        dispatch({ type: SheetActionType.SET_FREEZE_COLUMNS, freezeColumns: Number(e.target.value) })
                    }
                >
                    <option value="0">No freeze</option>
                    <option value="1">Freeze 1 column</option>
                    <option value="2">Freeze 2 columns</option>
                    <option value="3">Freeze 3 columns</option>
                </select>
                <button onClick={() => dispatch({ type: SheetActionType.SET_STYLE, textAlign: TextAlign.LEFT })}>
                    Left {sheetState.selectedCell?.textAlign === TextAlign.LEFT ? '(Active)' : ''}
                </button>
                <button onClick={() => dispatch({ type: SheetActionType.SET_STYLE, textAlign: TextAlign.CENTER })}>
                    Center {sheetState.selectedCell?.textAlign === TextAlign.CENTER ? '(Active)' : ''}
                </button>
                <button onClick={() => dispatch({ type: SheetActionType.SET_STYLE, textAlign: TextAlign.RIGHT })}>
                    Right {sheetState.selectedCell?.textAlign === TextAlign.RIGHT ? '(Active)' : ''}
                </button>
                <button
                    onClick={() =>
                        dispatch({
                            type: SheetActionType.SET_STYLE,
                            textStyle:
                                sheetState.selectedCell?.textStyle === TextStyle.NORMAL
                                    ? TextStyle.BOLD
                                    : TextStyle.NORMAL,
                        })
                    }
                >
                    Bold {sheetState.selectedCell?.textStyle === TextStyle.BOLD ? ' (Yes)' : ''}
                </button>
                Hide gridlines:
                <input
                    type="checkbox"
                    checked={sheetState.hideGridlines}
                    onChange={() =>
                        dispatch({ type: SheetActionType.TOGGLE_GRIDLINES, hideGridlines: !sheetState.hideGridlines })
                    }
                ></input>
                <button onClick={() => window.history.back()}>Undo</button>
                <button onClick={() => window.history.forward()}>Redo</button>
                <button onClick={() => alert('Hit Cmd+D or Ctrl+D to bookmark the page')}>Save or Share</button>
                <button onClick={() => alert('Hit Cmd+D or Ctrl+D to bookmark the page')}>Examples</button>
                {sheetState.multiplayerStatus === 'none' ? (
                    <>
                        <input
                            type="text"
                            value={sheetState.joinShareCode}
                            onChange={(e) =>
                                dispatch({ type: SheetActionType.UPDATE_JOIN_SHARE_CODE, code: e.target.value })
                            }
                        />
                        <button onClick={() => onJoinButtonClick()}>Join</button>
                        <button onClick={() => onStartServerClick()}>Start server</button>
                    </>
                ) : null}
                <a href="https://www.farseer.io">Created by Farseer</a>
            </div>
            <div>
                Formula bar
                <input
                    type="text"
                    value={sheetState.formulaBarContent}
                    onChange={(e) =>
                        dispatch({ type: SheetActionType.UPDATE_FORMULA_BAR_CONTENT, value: e.target.value })
                    }
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            dispatch({ type: SheetActionType.COMMIT_FORMULA_BAR });
                            e.preventDefault();
                            //@ts-ignore
                            e.target.blur();
                        } else if (e.key === 'Escape') {
                            dispatch({ type: SheetActionType.DISCARD_FORMULA_BAR });
                        }
                    }}
                    onBlur={(e) => {
                        dispatch({ type: SheetActionType.COMMIT_FORMULA_BAR });
                    }}
                ></input>
            </div>
            <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                <Sheet
                    sheetStyle={{
                        freezeRows: sheetState.freezeRows,
                        freezeColumns: sheetState.freezeColumns,
                        hideGridlines: sheetState.hideGridlines,
                    }}
                    displayData={displayData}
                    editData={editData}
                    sourceData={sourceData}
                    onSelectionChanged={onSelectionChanged}
                    cellStyle={cellStyle}
                    cellWidth={cellWidth}
                    cellHeight={cellHeight}
                    onChange={onChange}
                    readOnly={false}
                    onCellWidthChange={onCellWidthChange}
                    onCellHeightChange={onCellHeightChange}
                    dontCommitEditOnSelectionChange={dontCommitEditOnSelectionChange}
                    inputComponent={(x: any, y: any, inputProps: any, commitEditingCell: any) => {
                        const style = inputProps.style;
                        style.outline = '1px solid #1b73e7';

                        const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                            // parse
                            const value = e.target.value;

                            if (value.charAt(0) === '=') {
                                const formula = value.substring(1);
                                const tokens = tokenize(formula);
                                const lastToken = tokens[tokens.length - 1];

                                if (
                                    lastToken &&
                                    (lastToken.tokenType.name === 'Identifier' ||
                                        lastToken.tokenType.name === 'NumberLiteral' ||
                                        lastToken.tokenType.name === 'StringLiteral')
                                ) {
                                    setDontCommitEditOnSelectionChange(false);
                                    inputProps.onChange(value);
                                    return;
                                }
                                setDontCommitEditOnSelectionChange(true);
                                inputProps.onChange(value);
                            } else {
                                setDontCommitEditOnSelectionChange(false);
                                inputProps.onChange(value);
                            }
                        };
                        sheetInputOnChangeRef.current = inputProps.onChange;

                        return (
                            <input
                                type="text"
                                {...inputProps}
                                style={style}
                                onFocus={(e) => e.target.select()}
                                onChange={onChange}
                                value={inputProps.value}
                                ref={sheetInputRef}
                            />
                        );
                    }}
                />
            </div>

            {Array.from(pointerMap.entries()).map(([peerId, pointerData]) => {
                if (!pointerData.active) {
                    return null;
                }
                return (
                    <div
                        key={peerId}
                        style={{
                            color: pointerData.color,
                            position: 'fixed',
                            top: pointerData.y,
                            left: pointerData.x,
                            width: '10px',
                            height: '10px',
                        }}
                    >
                        <svg
                            version="1.1"
                            id="Layer_1"
                            xmlns="http://www.w3.org/2000/svg"
                            x="0px"
                            y="0px"
                            viewBox="1064.7701 445.5539 419.8101 717.0565"
                        >
                            <polygon
                                fill={pointerData.color}
                                points="1283.1857,1127.3097 1406.1421,1077.6322 1314.2406,850.1678 1463.913,852.7823 1093.4828,480.8547 
        1085.4374,1005.6964 1191.2842,899.8454 "
                            />
                        </svg>
                        <div>{peerId}</div>
                    </div>
                );
            })}
        </div>
    );
}

export default App;
