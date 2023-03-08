import { builtinMap, Instruction, Opcode } from './types';

function compare(a1: number | string, a2: number | string, op: Opcode) {
    switch (op) {
        case Opcode.EQ:
            return a1 === a2 ? 1 : 0;
        case Opcode.LTE:
            return a1 <= a2 ? 1 : 0;
        case Opcode.GTE:
            return a1 >= a2 ? 1 : 0;
        case Opcode.LT:
            return a1 < a2 ? 1 : 0;
        case Opcode.GT:
            return a1 > a2 ? 1 : 0;
        default:
            throw new Error('');
    }
}

export function evaluate(
    instructions: Instruction[],
    loader: (address: string) => number | string | null | (number | string | null)[][]
): number | string | null {
    const stack: (number | string | null | (number | string | null)[][])[] = [];

    for (const inst of instructions) {
        switch (inst.opcode) {
            case Opcode.LOAD: {
                stack.push(loader(inst.operand));
                break;
            }
            case Opcode.PUSH: {
                stack.push(inst.operand);
                break;
            }
            case Opcode.SUB:
            case Opcode.ADD: {
                let arg2 = stack.pop();
                let arg1 = stack.pop();

                let a1 = 0;
                let a2 = 0;
                if (arg1 === undefined || arg2 === undefined) {
                    throw new Error('Runtime error');
                }
                if (typeof arg1 === 'number') {
                    a1 = arg1;
                }
                if (typeof arg2 === 'number') {
                    a2 = arg2;
                }
                stack.push(inst.opcode === Opcode.ADD ? a1 + a2 : a1 - a2);
                break;
            }
            case Opcode.EQ:
            case Opcode.LTE:
            case Opcode.GTE:
            case Opcode.LT:
            case Opcode.GT: {
                let arg2 = stack.pop();
                let arg1 = stack.pop();
                if (arg1 === undefined || arg2 === undefined) {
                    throw new Error('Runtime error');
                }

                if (
                    (typeof arg1 === 'string' || typeof arg1 === 'number') &&
                    (typeof arg2 === 'number' || typeof arg2 === 'string')
                ) {
                    stack.push(compare(arg1, arg2, inst.opcode));
                } else {
                    stack.push(0);
                }

                break;
            }
            case Opcode.MUL:
            case Opcode.DIV: {
                let arg2 = stack.pop();
                let arg1 = stack.pop();
                let a1 = 0;
                let a2 = 0;
                if (arg1 === undefined || arg2 === undefined) {
                    throw new Error('Runtime error');
                }
                if (typeof arg1 === 'number') {
                    a1 = arg1;
                }
                if (typeof arg2 === 'number') {
                    a2 = arg2;
                }

                stack.push(inst.opcode === Opcode.MUL ? a1 * a2 : a1 / a2);
                break;
            }
            case Opcode.NEG: {
                let arg1 = stack.pop();

                let a1 = 0;
                if (arg1 === undefined) {
                    throw new Error('Runtime error');
                }
                if (typeof arg1 === 'number') {
                    a1 = arg1;
                }
                stack.push(-a1);
                break;
            }
            case Opcode.CALL: {
                const fnName = inst.operand as string;
                const func = builtinMap.get(fnName);
                if (!func) {
                    throw new Error('Runtime error');
                }
                const argCount = stack.pop();
                if (typeof argCount !== 'number') {
                    throw new Error('Runtime error');
                }
                func(argCount, stack);
                break;
            }
        }
    }

    if (stack.length !== 1) {
        throw new Error('Runtime error');
    }

    const result = stack[0];

    if (Array.isArray(result)) {
        throw new Error('Array not supported as a final result');
    }

    return result;
}
