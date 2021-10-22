export const Types = {
    Cell: 'cell',
    Number: 'number',
    Operator: 'operator',
    Function: 'function',
    LeftBracket: 'left bracket',
    RightBracket: 'right bracket',
    Semicolon: 'semicolon',
    Text: 'text',
};
export const Operators = {
    ['+']: { priority: 1, calc: (a, b) => a + b },
    ['-']: { priority: 1, calc: (a, b) => a - b },
    ['*']: { priority: 2, calc: (a, b) => a * b },
    ['/']: { priority: 2, calc: (a, b) => a / b },
    ['^']: { priority: 3, calc: (a, b) => Math.pow(a, b) },
};
export const Functions = {
    ['sum']: {
        priority: 4,
        calc: (...args) => args.reduce((sum, current) => sum + current, 0),
    },
    ['min']: { priority: 4, calc: (...args) => Math.min(...args) },
    ['max']: { priority: 4, calc: (...args) => Math.max(...args) },
    ['pow']: { priority: 3, calc: (a, b) => Math.pow(a, b) },
    ['log']: { priority: 2, calc: (a, b) => Math.log(a, b) },
};
