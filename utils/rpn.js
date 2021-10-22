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

/**
 * Класс для хранения значений токенов формулы
 * Вводимая формула разбивается на токены и уже в расчетчике используется в виде массива токенов.
 */
class Token {
    // типы токенов
    static Types = {
        Cell: 'cell',
        Number: 'number',
        Operator: 'operator',
        Function: 'function',
        LeftBracket: 'left bracket',
        RightBracket: 'right bracket',
        Semicolon: 'semicolon',
        Text: 'text',
    };
    // строка разделителей вида "+-*/^();"" :
    static separators = Object.keys(Operators).join('') + '();';
    // шаблон разделитетей вида "[\+\-\*\/\^\(\)]" :
    static sepPattern = new RegExp(`[${Token.escape(Token.separators)}]`, 'g');

    static funcPattern = new RegExp(
        `${Object.keys(Functions).join('|').toLowerCase()}`,
        'g'
    );

    #type;
    #value;
    #calc;
    #priority;

    /**
     * Конструктор токена, в котором обязательным параметром задается тип токена,
     * а прочие параметры устанавливаются в зависимости от типа
     * @param {Types} type
     * @param {Array} params
     */
    constructor(type, value) {
        this.#type = type;
        this.#value = value;
        if (type === Token.Types.Operator) {
            this.#calc = Operators[value].calc;
            this.#priority = Operators[value].priority;
        } else if (type === Token.Types.Function) {
            this.#calc = Functions[value].calc;
            this.#priority = Functions[value].priority;
        }
    }

    /**
     * Получение типа токена
     */
    get type() {
        return this.#type;
    }

    /**
     * Получение значения токена
     * Применимо для токенов со всеми типами, кроме Token.Types.Operator
     */
    get value() {
        return this.#value;
    }

    /**
     * Получение функции, соответствующей оператору токена
     * Применимо только для токена с типом Token.Types.Operator
     */
    get calc() {
        return this.#calc;
    }

    /**
     * Получение приоритета оператора токена
     * Применимо только для токена с типом Token.Types.Operator
     */
    get priority() {
        return this.#priority;
    }

    /**
     * Преобразование формульной строки на массив текстовых токенов
     * @param {String} formula - разбиение формулы на токены
     * @returns {Array<String>} - массив текстовых токенов
     */
    static splitFormula(formula) {
        let strTokens = formula
            .replace(/\s+/g, '') // очистка от пробельных символов
            .replace(/(?<=\d+),(?=\d+)/g, '.') // замена запятой на точку (для чисел)
            .replace(/^\-/g, '0-') // подстановка отсутствующего 0 для знака "-" в начале строки
            .replace(/\(\-/g, '(0-') // подстановка отсутствующего 0 для знака "-" в середине строки
            .replace(/\;\-/g, ';0-') // подстановка отсутствующего 0 для знака "-" в выражении функции
            .replace(Token.sepPattern, '&$&&') // вставка знака & перед разделителями
            .split('&') // разбиение на токены по знаку &
            .filter((item) => item != ''); // удаление из массива пустых элементов
        return strTokens;
    }

    /**
     * Разбирает формулу на токены
     * @param {Sring} formula строка с формулой
     */
    static getTokens(formula) {
        let tokens = [];
        let strTokens = Token.splitFormula(formula);
        strTokens.forEach((tokenCode) => {
            if (tokenCode in Operators)
                tokens.push(new Token(Token.Types.Operator, tokenCode));
            else if (tokenCode === '(')
                tokens.push(new Token(Token.Types.LeftBracket, tokenCode));
            else if (tokenCode === ')')
                tokens.push(new Token(Token.Types.RightBracket, tokenCode));
            else if (tokenCode === ';')
                tokens.push(new Token(Token.Types.Semicolon, tokenCode));
            else if (tokenCode.toLowerCase().match(Token.funcPattern) !== null)
                tokens.push(
                    new Token(Token.Types.Function, tokenCode.toLowerCase())
                );
            else if (tokenCode.match(/^\d+[.]?\d*/g) !== null)
                tokens.push(new Token(Token.Types.Number, Number(tokenCode)));
            else if (tokenCode.match(/^[A-Z]+[1-9][0-9]*/g) !== null)
                tokens.push(new Token(Token.Types.Cell, tokenCode));
        });
        return tokens;
    }

    /**
     * Экранирование обратным слешем специальных символов
     * @param {String} str
     */
    static escape(str) {
        return str.replace(/[-\/\\^$*+?.()|[\]{};]/g, '\\$&');
    }

    /**
     * Переопределение сериализации объекта в JSON
     */
    toJSON() {
        return {
            type: this.#type,
            value: this.#value,
        };
    }
}

/**
 * Класс калькулятора, вычисляющего выражения с функциями, числами и ячейками электронных таблиц.
 * Аргументы функций указываются в круглых скобках, разделяемые точкой с запятой.
 */
class Calculator {
    #calcData;

    /**
     * Конструктор калькулятора
     * @param {CalcData} calcData - объект с данными ячеек, содержащих как формулы, так и первичные значения
     */
    constructor(calcData) {
        this.#calcData = calcData;
    }

    /**
     * Расчет значений для формулы
     * @param {String} formula агрумент может быть представлен как в виде формулы в виде строки,
     *      так и в виде массива токенов, на которые была предварительна разобрана формула в виде сроки.
     * Токен представляет собой объект вида { type: Types.xxx [, value: xxx] [, calc:xxx] [, pririty:xxx]},
     *      который получается в результате разбора формулы в виде строки функцией getTokens(String)
     */
    calc(formula) {
        let tokens = Array.isArray(formula)
            ? formula
            : Token.getTokens(formula);
        let operators = [];
        let operands = [];
        let funcs = [];
        let params = new Map();
        tokens.forEach((token) => {
            switch (token.type) {
                case Token.Types.Number:
                    operands.push(token);
                    break;
                case Token.Types.Cell:
                    if (!this.#calcData)
                        throw new Error(
                            'Для калькулятора не определен источник данных ячеек'
                        );
                    operands.push(this.#calcData.getNumberToken(token));
                    break;
                case Token.Types.Function:
                    funcs.push(token);
                    params.set(token, []);
                    operators.push(token);
                    break;
                case Token.Types.Semicolon:
                    this.calcExpression(operands, operators, 1);
                    let funcToken = operators[operators.length - 2]; // получить имя функции из стека операторов
                    params.get(funcToken).push(operands.pop()); // извлечь из стека последний операнд и добавить его в параметы функции
                    break;
                case Token.Types.Operator:
                    this.calcExpression(operands, operators, token.priority);
                    operators.push(token);
                    break;
                case Token.Types.LeftBracket:
                    operators.push(token);
                    break;
                case Token.Types.RightBracket:
                    this.calcExpression(operands, operators, 1);
                    operators.pop();
                    // если последний оператор в стеке является функцией
                    if (
                        operators.length &&
                        operators[operators.length - 1].type ==
                            Token.Types.Function
                    ) {
                        let funcToken = operators.pop(); // получить имя функции из стека операторов
                        let funcArgs = params.get(funcToken); // получить массив токенов аргументов функции
                        let paramValues = [];
                        if (operands.length) {
                            // добавить последний аргумент функции
                            funcArgs.push(operands.pop());
                            // получить массив значений всех аргументов функции
                            paramValues = funcArgs.map((item) => item.value);
                        }
                        // вычислить значение функции и положить в стек операндов
                        operands.push(
                            this.calcFunction(funcToken.calc, ...paramValues)
                        );
                    }
                    break;
            }
        });
        this.calcExpression(operands, operators, 0);
        return operands.pop().value;
    }

    /**
     * Вычисление подвыражения внутри (без) скобок
     * @param {Array} operands массив операндов
     * @param {Array} operators массив операторов
     * @param {Number} minPriority минимальный приоритет для вычисления выражения
     */
    calcExpression(operands, operators, minPriority) {
        while (
            operators.length &&
            operators[operators.length - 1].priority >= minPriority
        ) {
            let rightOperand = operands.pop().value;
            let leftOperand = operands.pop().value;
            let operator = operators.pop();
            let result = operator.calc(leftOperand, rightOperand);
            if (isNaN(result) || !isFinite(result)) result = 0;
            operands.push(new Token(Token.Types.Number, result));
        }
    }

    /**
     * Вычисление значений функции
     * @param {T} func - функция обработки аргументов
     * @param  {...Number} params - массив числовых значений аргументов
     */
    calcFunction(calc, ...params) {
        return new Token(Token.Types.Number, calc(...params));
    }
}

let formula1 = 'max(2*15; 10; 20)';
let formula2 = 'min(2; 10; 20)';
let formula3 = 'sum(2*15; 10; 20)';
let formula4 = '23*56';
let formula5 = '-56 + 12 * 54';

let calculator = new Calculator(null);
console.log(formula1 + ' = ' + calculator.calc(formula1));
console.log(formula2 + ' = ' + calculator.calc(formula2));
console.log(formula3 + ' = ' + calculator.calc(formula3));
console.log(formula4 + ' = ' + calculator.calc(formula4));
console.log(formula5 + ' = ' + calculator.calc(formula5));
