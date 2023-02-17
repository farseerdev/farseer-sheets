import {
    createToken,
    Lexer,
    CstParser,
    MismatchedTokenException,
    NotAllInputParsedException,
    NoViableAltException,
    tokenMatcher,
    IToken,
    ICstVisitor,
} from 'chevrotain';
import { BuiltinFunction, builtinMap, CodeGenerator, Instruction, Opcode } from './types';

const AdditionOperator = createToken({ name: 'AdditionOperator', pattern: Lexer.NA });
const MultiplicationOperator = createToken({ name: 'MultiplicationOperator', pattern: Lexer.NA });
const ComparisonOperator = createToken({ name: 'ComparisonOperator', pattern: Lexer.NA });
const Plus = createToken({ name: 'Plus', pattern: /\+/, categories: AdditionOperator });
const Minus = createToken({ name: 'Minus', pattern: /-/, categories: AdditionOperator });
const Multi = createToken({ name: 'Multi', pattern: /\*/, categories: MultiplicationOperator });
const Div = createToken({ name: 'Div', pattern: /\//, categories: MultiplicationOperator });
const Ampersand = createToken({ name: 'Ampersand', pattern: /&/, categories: AdditionOperator });
const GreaterThanOrEqual = createToken({ name: 'GreaterThanOrEqual', pattern: />=/, categories: ComparisonOperator });
const GreaterThan = createToken({ name: 'GreaterThan', pattern: />/, categories: ComparisonOperator });
const LessThan = createToken({ name: 'LessThan', pattern: /</, categories: ComparisonOperator });
const LessThanOrEqual = createToken({ name: 'LessThanOrEqual', pattern: /<=/, categories: ComparisonOperator });
const Equal = createToken({ name: 'Equal', pattern: /=/, categories: ComparisonOperator });
const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /\s+/, group: Lexer.SKIPPED });
const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /\d+(?:\.\d*)?/ });
const CellAddress = createToken({ name: 'CellAddress', pattern: /[$]?[a-zA-Z]+[$]?\d+/ });
const CellAddressRange = createToken({ name: 'CellAddressRange', pattern: /[$]?[a-zA-Z]+[$]?\d+:[$]?[a-zA-Z]+[$]?\d+/ });
const StringLiteral = createToken({ name: 'StringLiteral', pattern: /".*?"/ });
const LParen = createToken({ name: 'LParen', pattern: /\(/ });
const RParen = createToken({ name: 'RParen', pattern: /\)/ });
const Comma = createToken({ name: 'Comma', pattern: /,/ });
const Identifier = createToken({ name: 'Identifier', pattern: /(?:[a-zA-ZčČćĆđĐšŠžŽ][\w čČćĆđĐšŠžŽ]*)/ });

export const allTokens = {
    WhiteSpace,
    Plus,
    Minus,
    Multi,
    Div,
    GreaterThanOrEqual,
    LessThanOrEqual,
    GreaterThan,
    LessThan,
    Equal,
    LParen,
    RParen,
    NumberLiteral,
    AdditionOperator,
    MultiplicationOperator,
    ComparisonOperator,
    Ampersand,
    Comma,
    CellAddressRange,
    CellAddress,
    Identifier,
    StringLiteral,
};

class FormulaParser extends CstParser {
    constructor() {
        super(Object.values(allTokens), {
            recoveryEnabled: true,
        });
        this.performSelfAnalysis();
    }

    public expression = this.RULE('expression', () => {
        return this.SUBRULE(this.comparisonExpression);
    });

    public comparisonExpression = this.RULE('comparisonExpression', () => {
        this.SUBRULE(this.additionExpression, { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(ComparisonOperator);
            this.SUBRULE2(this.additionExpression, { LABEL: 'rhs' });
        });
    });

    public additionExpression = this.RULE('additionExpression', () => {
        this.SUBRULE(this.multiplicationExpression, { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(AdditionOperator);
            this.SUBRULE2(this.multiplicationExpression, { LABEL: 'rhs' });
        });
    });

    public multiplicationExpression = this.RULE('multiplicationExpression', () => {
        this.SUBRULE(this.atomicWithOptionalUnaryMinus, { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(MultiplicationOperator);
            this.SUBRULE2(this.atomicWithOptionalUnaryMinus, { LABEL: 'rhs' });
        });
    });

    public atomicWithOptionalUnaryMinus = this.RULE('atomicWithOptionalUnaryMinus', () => {
        this.OPTION(() => {
            this.CONSUME(Minus);
        });
        this.SUBRULE(this.atomicExpression);
    });

    public atomicExpression = this.RULE('atomicExpression', () => {
        this.OR([
            { ALT: () => this.CONSUME(CellAddressRange) },
            { ALT: () => this.CONSUME(CellAddress) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.SUBRULE(this.parenthesisExpression) },
            { ALT: () => this.SUBRULE(this.functionCall) },
            { ALT: () => this.CONSUME(NumberLiteral) },
        ]);
    });

    public parenthesisExpression = this.RULE('parenthesisExpression', () => {
        this.CONSUME(LParen);
        this.SUBRULE(this.expression);
        this.CONSUME(RParen);
    });

    public functionCall = this.RULE('functionCall', () => {
        this.CONSUME(Identifier);
        this.CONSUME(LParen);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => {
                this.SUBRULE(this.expression);
            },
        });
        this.CONSUME(RParen);
    });
}

const formulaParser = new FormulaParser();
const formulaLexer = new Lexer(Object.values(allTokens));
const BaseCstVisitor = formulaParser.getBaseCstVisitorConstructor();

class Visitor extends BaseCstVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }

    expression(ctx: any, codeGenerator: CodeGenerator) {
        this.visit(ctx.comparisonExpression, codeGenerator);
    }

    comparisonExpression(ctx: any, codeGenerator: CodeGenerator) {
        this.visit(ctx.lhs, codeGenerator);

        if (ctx.ComparisonOperator !== undefined && ctx.rhs !== undefined) {
            for (let index = 0; index < ctx.rhs.length; index++) {
                const rhsOperand = ctx.rhs[index];
                this.visit(rhsOperand, codeGenerator);
                let operator = ctx.ComparisonOperator[index];

                if (tokenMatcher(operator, GreaterThan)) {
                    codeGenerator.addInstruction({ opcode: Opcode.GT });
                } else if (tokenMatcher(operator, GreaterThanOrEqual)) {
                    codeGenerator.addInstruction({ opcode: Opcode.GTE });
                } else if (tokenMatcher(operator, LessThan)) {
                    codeGenerator.addInstruction({ opcode: Opcode.LT });
                } else if (tokenMatcher(operator, LessThanOrEqual)) {
                    codeGenerator.addInstruction({ opcode: Opcode.LTE });
                } else if (tokenMatcher(operator, Equal)) {
                    codeGenerator.addInstruction({ opcode: Opcode.EQ });
                }
            }
        }
    }

    additionExpression(ctx: any, codeGenerator: CodeGenerator) {
        this.visit(ctx.lhs, codeGenerator);

        if (ctx.AdditionOperator !== undefined && ctx.rhs !== undefined) {
            for (let index = 0; index < ctx.rhs.length; index++) {
                const rhsOperand = ctx.rhs[index];
                this.visit(rhsOperand, codeGenerator);
                let operator = ctx.AdditionOperator[index];

                if (tokenMatcher(operator, Plus)) {
                    codeGenerator.addInstruction({ opcode: Opcode.ADD });
                } else if (tokenMatcher(operator, Minus)) {
                    codeGenerator.addInstruction({ opcode: Opcode.SUB });
                }
            }
        }
    }

    multiplicationExpression(ctx: any, codeGenerator: CodeGenerator) {
        this.visit(ctx.lhs, codeGenerator);

        if (ctx.MultiplicationOperator !== undefined && ctx.rhs !== undefined) {
            for (let index = 0; index < ctx.rhs.length; index++) {
                const rhsOperand = ctx.rhs[index];
                this.visit(rhsOperand, codeGenerator);
                let operator = ctx.MultiplicationOperator[index];

                if (tokenMatcher(operator, Multi)) {
                    codeGenerator.addInstruction({ opcode: Opcode.MUL });
                } else if (tokenMatcher(operator, Div)) {
                    codeGenerator.addInstruction({ opcode: Opcode.DIV });
                }
            }
        }
    }

    atomicWithOptionalUnaryMinus(ctx: any, codeGenerator: CodeGenerator) {
        this.visit(ctx.atomicExpression, codeGenerator);
        const hasUnaryMinus = ctx.Minus !== undefined && ctx.Minus.length > 0;
        if (hasUnaryMinus) {
            codeGenerator.addInstruction({ opcode: Opcode.NEG });
        }
    }

    atomicExpression(ctx: any, codeGenerator: CodeGenerator) {
        if (ctx.CellAddressRange !== undefined) {
            this.cellAddressRange(ctx.CellAddressRange[0], codeGenerator);
        } else if (ctx.CellAddress !== undefined) {
            this.cellAddress(ctx.CellAddress[0], codeGenerator);
        } else if (ctx.StringLiteral !== undefined) {
            this.stringLiteral(ctx.StringLiteral[0], codeGenerator);
        } else if (ctx.NumberLiteral !== undefined) {
            this.numberLiteral(ctx.NumberLiteral[0], codeGenerator);
        } else if (ctx.functionCall !== undefined) {
            this.visit(ctx.functionCall, codeGenerator);
        } else if (ctx.parenthesisExpression !== undefined) {
            this.visit(ctx.parenthesisExpression, codeGenerator);
        }
    }

    functionCall(ctx: any, codeGenerator: CodeGenerator) {
        const fnName: string = ctx.Identifier[0].image.toLowerCase();
        const func = builtinMap.get(fnName);
        if (!func) {
            throw new Error('Cannot find func');
        }
        if (ctx.expression) {
            for (const expr of ctx.expression) {
                this.visit(expr, codeGenerator);
            }
        }
        codeGenerator.addInstruction({ opcode: Opcode.PUSH, operand: ctx.expression ? ctx.expression.length : 0 }); // arg count
        codeGenerator.addInstruction({ opcode: Opcode.CALL, operand: fnName });
    }

    cellAddressRange(token: IToken, codeGenerator: CodeGenerator) {
        codeGenerator.addInstruction({ opcode: Opcode.LOAD, operand: token.image });
    }

    cellAddress(token: IToken, codeGenerator: CodeGenerator) {
        codeGenerator.addInstruction({ opcode: Opcode.LOAD, operand: token.image });
    }

    stringLiteral(token: IToken, codeGenerator: CodeGenerator) {
        const str = token.image.substring(1, token.image.length - 1);
        codeGenerator.addInstruction({ opcode: Opcode.PUSH, operand: str });
    }

    numberLiteral(token: IToken, codeGenerator: CodeGenerator) {
        const number = Number(token.image);
        codeGenerator.addInstruction({ opcode: Opcode.PUSH, operand: number });
    }

    parenthesisExpression(ctx: any, codeGenerator: CodeGenerator) {
        this.visit(ctx.expression, codeGenerator);
    }
}

const visitor = new Visitor();

export function compileFormula(formula: string) {
    const lexingResult = formulaLexer.tokenize(formula);
    if (lexingResult.errors && lexingResult.errors.length > 0) {
        // error
    }

    formulaParser.input = lexingResult.tokens;

    if (formulaParser.errors && formulaParser.errors.length > 0) {
        // error
        console.log('error', formulaParser.errors);
    }

    const instructions: Instruction[] = [];
    const codeGenerator: CodeGenerator = {
        addInstruction: (instruction: Instruction) => {
            instructions.push(instruction);
        },
    };
    const cst = formulaParser.expression();
    try {
        visitor.visit(cst, codeGenerator);
    } catch (e) {
        console.log('error in visitor', e);
        // error
    }

    return instructions;
}

export function tokenize(formula: string) {
    const lexingResult = formulaLexer.tokenize(formula);
    return lexingResult.tokens;
}
