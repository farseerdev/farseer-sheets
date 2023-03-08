import { StackType } from "./types";

// utility functions
function reduceStack(
    count: number,
    stack: StackType,
    reducer: (value: number | string | null) => void
) {
    for (let i = 0; i < count; i++) {
        const elem = stack.pop();
        if (elem === undefined) {
            throw new Error('Runtime error');
        }
        if (Array.isArray(elem)) {
            for (let y = elem.length - 1; y >= 0; y--) {
                for (let x = elem[y].length - 1; x >= 0; x--) {
                    const e = elem[y][x];
                    reducer(e);
                }
            }
        } else {
            reducer(elem);
        }
    }
}

function createSingleValueMathFunc(fn: (n: number) => number) {
    return function (argCount: number, stack: StackType) {
        if (argCount !== 1) {
            throw new Error('Runtime error');
        }
        const arg = stack.pop();
        if (arg === undefined) {
            throw new Error('Runtime error');
        }
        if (typeof arg !== 'number') {
            stack.push('#VALUE!');
            return;
        }
        stack.push(fn(arg));
    };
}

function ifsHelper(criteriaCount: number, stack: StackType) {
    const result: boolean[] = [];
    const criteriaRanges: StackType = [];
    const criterias: StackType = [];

    let rowCount = -1;
    let criteria = true;

    for (let i = criteriaCount; i > 0; i--) {
        const stackElem = stack.pop();
        if (stackElem === undefined) {
            throw new Error('Runtime error');
        }
        if (criteria) {
            criterias.push(stackElem);
            criteria = false;
        } else {
            if (!Array.isArray(stackElem)) {
                throw new Error('Runtime error');
            }
            if (rowCount !== -1 && stackElem.length !== rowCount) {
                throw new Error('Runtime error');
            }
            rowCount = stackElem.length;
            criteriaRanges.push(stackElem);
            criteria = true;
        }
    }

    if (rowCount === -1) {
        throw new Error('Runtime error');
    }

    for (let row = 0; row < rowCount; row++) {
        let pass = true;
        for (let i = 0; i < criteriaRanges.length; i++) {
            const critRange = criteriaRanges[i];
            const crit = criterias[i];
            if (!Array.isArray(critRange)) {
                throw new Error('Runtime error');
            }
            if (Array.isArray(crit)) {
                if (critRange[row] !== crit[row]) {
                    pass = false;
                    break;
                }
            } else {
                if (critRange[row][0] !== crit) {
                    pass = false;
                    break;
                }
            }
        }
        result[row] = pass;
    }
    return result;
}

// exported

export function sum(argCount: number, stack: StackType) {
    let total = 0;
    reduceStack(argCount, stack, (value) => {
        if (typeof value === 'number') {
            total += value;
        }
    });

    stack.push(total);
}

export function average(argCount: number, stack: StackType) {
    let total = 0;
    let count = 0;
    reduceStack(argCount, stack, (value) => {
        if (typeof value === 'number') {
            total += value;
            count += 1;
        }
    });

    if (count === 0) {
        stack.push(null);
    } else {
        stack.push(total / count);
    }
}

export function count(argCount: number, stack: StackType) {
    let count = 0;
    reduceStack(argCount, stack, (value) => {
        if (value !== null) {
            count += 1;
        }
    });
    stack.push(count);
}

export function min(argCount: number, stack: StackType) {
    let min = 0;
    let foundOne = false;
    reduceStack(argCount, stack, (value) => {
        if (typeof value === 'number') {
            if (!foundOne) {
                min = value;
                foundOne = true;
            } else {
                if (value < min) {
                    min = value;
                }
            }
        }
    });
    if (foundOne) {
        stack.push(min);
    } else {
        stack.push(null);
    }
}

export function max(argCount: number, stack: StackType) {
    let max = 0;
    let foundOne = false;
    reduceStack(argCount, stack, (value) => {
        if (typeof value === 'number') {
            if (!foundOne) {
                max = value;
                foundOne = true;
            } else {
                if (value > max) {
                    max = value;
                }
            }
        }
    });
    if (foundOne) {
        stack.push(max);
    } else {
        stack.push(null);
    }
}

export function iffunc(argCount: number, stack: StackType) {
    if (argCount === 3) {
        const elseResult = stack.pop();
        const thanResult = stack.pop();
        const logicalTest = stack.pop();
        if (elseResult === undefined || thanResult === undefined || logicalTest === undefined) {
            throw new Error('Runtime error');
        }
        if (logicalTest) {
            stack.push(thanResult);
        } else {
            stack.push(elseResult);
        }
    } else if (argCount === 2) {
        const thanResult = stack.pop();
        const logicalTest = stack.pop();
        if (thanResult === undefined || logicalTest === undefined) {
            throw new Error('Runtime error');
        }
        if (logicalTest) {
            stack.push(thanResult);
        } else {
            stack.push(null);
        }
    } else {
        throw new Error('Runtime error');
    }
}

export function vlookup(argCount: number, stack: StackType) {
    if (argCount !== 3) {
        throw new Error('Runtime error');
    }
    const columnIndex = stack.pop();
    const searchTable = stack.pop();
    const searchTerm = stack.pop();

    if (!Array.isArray(searchTable)) {
        throw new Error('Runtime error');
    }
    if (typeof columnIndex !== 'number') {
        throw new Error('Runtime error');
    }

    for (let row = 0; row < searchTable.length; row++) {
        if (searchTable[row][0] === searchTerm) {
            const val = searchTable[row][columnIndex - 1];
            if (val !== undefined) {
                stack.push(val);
            } else {
                stack.push(null);
            }
            return;
        }
    }
    stack.push('#N/A');
}

export function power(argCount: number, stack: StackType) {
    if (argCount !== 2) {
        throw new Error('Runtime error');
    }
    const exponent = stack.pop();
    const base = stack.pop();
    if (typeof exponent !== 'number' || typeof base !== 'number') {
        stack.push('#VALUE!');
        return;
    }
    stack.push(Math.pow(base, exponent));
}

export const abs = createSingleValueMathFunc(Math.abs);
export const floor = createSingleValueMathFunc(Math.floor);
export const ceiling = createSingleValueMathFunc(Math.ceil);
export const sin = createSingleValueMathFunc(Math.sin);
export const cos = createSingleValueMathFunc(Math.cos);
export const log = createSingleValueMathFunc(Math.log10);

export function rand(argCount: number, stack: StackType) {
    if (argCount !== 0) {
        throw new Error('Runtime error');
    }
    stack.push(Math.random());
}

export function randbetween(argCount: number, stack: StackType) {
    if (argCount !== 2) {
        throw new Error('Runtime error');
    }
    const from = stack.pop();
    const to = stack.pop();
    if (typeof from !== 'number' || typeof to !== 'number') {
        stack.push('#VALUE!');
        return;
    }

    stack.push(Math.round(Math.random() * (to - from) + from));
}

export function sumifs(argCount: number, stack: StackType) {
    if (argCount < 3) {
        throw new Error('Runtime error');
    }

    if (argCount % 2 !== 1) {
        throw new Error('Runtime error');
    }

    const trueFalse = ifsHelper(argCount - 1, stack);

    // pop the sum range
    const sumRange = stack.pop()!;

    if (!Array.isArray(sumRange)) {
        throw new Error('Runtime error');
    }

    let result = 0;

    for (let row = 0; row < sumRange.length; row++) {
        let pass = trueFalse[row];
        const val = sumRange[row][0];
        if (pass && typeof val === 'number') {
            result += val;
        }
    }
    stack.push(result);
}

export function countifs(argCount: number, stack: StackType) {
    if (argCount < 2) {
        throw new Error('Runtime error');
    }

    if (argCount % 2 !== 0) {
        throw new Error('Runtime error');
    }

    const trueFalse = ifsHelper(argCount, stack);

    let result = 0;

    for (let row = 0; row < trueFalse.length; row++) {
        let pass = trueFalse[row];
        if (pass) {
            result += 1;
        }
    }
    stack.push(result);
}

export function and(argCount: number, stack: StackType) {
    let result = 1;
    for (let i = 0; i < argCount; i++) {
        const elem = stack.pop();
        if (!elem) {
            result = 0;
            break;
        }
        if (Array.isArray(elem)) {
            result = 0;
            break;
        }
        result = result && !!elem ? 1 : 0;
    }
    stack.push(result);
}

export function or(argCount: number, stack: StackType) {
    let result = 0;
    for (let i = 0; i < argCount; i++) {
        const elem = stack.pop();
        if (!elem) {
            continue;
        }
        if (Array.isArray(elem)) {
            continue;
        }
        if (elem) {
            result = 1;
            break;
        }
    }
    stack.push(result);
}

export function not(argCount: number, stack: StackType) {
    if (argCount !== 1) {
        throw new Error('Runtime error');
    }
    const arg = stack.pop();
    if (arg === undefined) {
        throw new Error('Runtime error');
    }

    stack.push(!!arg ? 0 : 1);
}

export function len(argCount: number, stack: StackType) {
    if (argCount !== 1) {
        throw new Error('Runtime error');
    }
    const arg = stack.pop();
    if (arg === undefined) {
        throw new Error('Runtime error');
    }
    if (typeof arg === 'string') {
        stack.push(arg.length);
        return;
    }

    stack.push(0);
}

export function value(argCount: number, stack: StackType) {
    if (argCount !== 1) {
        throw new Error('Runtime error');
    }
    const arg = stack.pop();
    if (arg === undefined) {
        throw new Error('Runtime error');
    }
    if (typeof arg === 'string') {
        const num = Number(arg);
        if (!isNaN(num)) {
            stack.push(num);
        } else {
            stack.push('#VALUE!');
        }
        return;
    }
    stack.push('#VALUE!');
}

export function text(argCount: number, stack: StackType) {
    if (argCount !== 1) {
        throw new Error('Runtime error');
    }
    const arg = stack.pop();
    if (arg === undefined) {
        throw new Error('Runtime error');
    }
    if (typeof arg === 'number') {
        stack.push(arg.toString());
        return;
    }
    stack.push('');
}

export function round(argCount: number, stack: StackType) {
    if (argCount !== 2) {
        throw new Error('Runtime error');
    }

    const arg2 = stack.pop();
    const arg1 = stack.pop();
    if (typeof arg1 !== 'number' || typeof arg2 !== 'number') {
        throw new Error('Runtime error');
    }
    const sign = arg1 >= 0 ? 1 : -1;
    const powerOfTen = Math.pow(10, arg2);
    const result = Math.round(powerOfTen * arg1 + sign * 0.0001) / powerOfTen;
    stack.push(result);
}

export function concat(argCount: number, stack: StackType) { 
    const array: string[] = [];
    reduceStack(argCount, stack, (value) => {
        if (value === null) {
            return;
        }
        array.push(value.toString());
    });
    stack.push(array.reverse().join(''));
}

export function trim(argCount: number, stack: StackType) { 
    if (argCount !== 1) {
        throw new Error('Runtime error');
    }
    const arg = stack.pop();
    if (typeof arg === 'number' || typeof arg === 'string') {
        stack.push(arg.toString().trim());
    } else {
        stack.push(null);
    }
}

export function left(argCount: number, stack: StackType) { 
    if (argCount < 1 || argCount > 2) {
        throw new Error('Runtime error');
    }
    let chars = 1;
    if (argCount === 2) {
        const charArg = stack.pop();
        if (typeof charArg === 'number') {
            chars = charArg;
        }
    }
    const textArg = stack.pop();
    if (typeof textArg === 'number' || typeof textArg === 'string') {
        const text = textArg.toString();
        stack.push(text.substring(0, chars));
    } else {
        stack.push(null);
    }
}

export function right(argCount: number, stack: StackType) { 
    if (argCount < 1 || argCount > 2) {
        throw new Error('Runtime error');
    }
    let chars = 1;
    if (argCount === 2) {
        const charArg = stack.pop();
        if (typeof charArg === 'number') {
            chars = charArg;
        }
    }
    const textArg = stack.pop();
    if (typeof textArg === 'number' || typeof textArg === 'string') {
        const text = textArg.toString();
        stack.push(text.substring(text.length-chars));
    } else {
        stack.push(null);
    }
}

export function mid(argCount: number, stack: StackType) { 
    if (argCount !== 3) {
        throw new Error('Runtime error');
    }
    const countArg = stack.pop();
    const fromArg = stack.pop();
    const textArg = stack.pop();

    if (typeof fromArg !== 'number') {
        throw new Error('Runtime error');
    }
    if (fromArg === 0) {
        throw new Error('Runtime error');
    }
    let count = 0;
    if (typeof countArg === 'number') {
        count = countArg;
    }

    if (typeof textArg === 'number' || typeof textArg === 'string') {
        const text = textArg.toString();
        stack.push(text.substring(fromArg - 1, fromArg - 1 + count));
    } else {
        stack.push(null);
    }
}

export function find(argCount: number, stack: StackType) { 

}

export function pmt(argCount: number, stack: StackType) { 

}

export function ifs(argCount: number, stack: StackType) { 

}

export function index(argCount: number, stack: StackType) { 

}

export function match(argCount: number, stack: StackType) { 

}

export function sumif(argCount: number, stack: StackType) { 

}

export function countif(argCount: number, stack: StackType) { 

}

export function column(argCount: number, stack: StackType) { 

}

export function row(argCount: number, stack: StackType) { 

}

export function address(argCount: number, stack: StackType) { 

}

export function indirect(argCount: number, stack: StackType) { 

}

export function iferror(argCount: number, stack: StackType) { 

}


