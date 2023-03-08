import * as builtin from './builtin';

export const enum Opcode {
    PUSH,
    LOAD,
    ADD,
    SUB,
    MUL,
    DIV,
    GT,
    GTE,
    LT,
    LTE,
    EQ,
    NEG,
    CALL,
}

export interface Instruction {
    opcode: Opcode;
    operand?: any;
}

export interface CodeGenerator {
    addInstruction: (instruction: Instruction) => void;
}

export type StackType = (number | string | null | (number | string | null)[][])[];

export type BuiltinFunction = (
    argCount: number,
    stack: StackType
) => void;


export const builtinMap = new Map<string, BuiltinFunction>([
    ['sum', builtin.sum],
    ['average', builtin.average],
    ['count', builtin.count],
    ['min', builtin.min],
    ['max', builtin.max],
    ['if', builtin.iffunc],
    ['vlookup', builtin.vlookup],
    ['power', builtin.power],
    ['abs', builtin.abs],
    ['floor', builtin.floor],
    ['ceiling', builtin.ceiling],
    ['sin', builtin.sin],
    ['cos', builtin.cos],
    ['log', builtin.log],
    ['rand', builtin.rand],
    ['randbetween', builtin.randbetween],
    ['sumifs', builtin.sumifs],
    ['and', builtin.and],
    ['or', builtin.or],
    ['not', builtin.not],
    ['len', builtin.len],
    ['value', builtin.value],
    ['text', builtin.text],
    ['countifs', builtin.countifs],
    ['round', builtin.round],
    ['concat', builtin.concat],
    ['trim', builtin.trim],
    ['left', builtin.left],
    ['right', builtin.right],
    ['mid', builtin.mid],
]);
