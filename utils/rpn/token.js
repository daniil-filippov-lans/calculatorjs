export default class Token {
    // строка разделителей вида "+-*/^();""
    static separators = Object.keys(Operators).join('') + '();';

    // шаблон разделителей вида "[\+\-\*\/\^\(\)\;]"
    static sepPattern = `[${Token.escape(Token.separators)}]`;

    // шаблон функций вида "random|round|...|sum|min|max|if"
    static funcPattern = new RegExp(
        `${Object.keys(Functions).join('|').toLowerCase()}`,
        'g'
    );

    #type;
    #value;
    #calc;
    #priority;

    /**
     * Конструктор токена, которому передаются в качестве аргументов тип и значение токена,
     * а прочие параметры устанавливаются в зависимости от типа
     */
    constructor(type, value) {
        this.#type = type;
        this.#value = value;
        if (type === Types.Operator) {
            this.#calc = Operators[value].calc;
            this.#priority = Operators[value].priority;
        } else if (type === Types.Function) {
            this.#calc = Functions[value].calc;
            this.#priority = Functions[value].priority;
        }
    }

    /**
     * Реализация геттеров для приватных полей класса
     */

    /**
     * Разбирает формулу на токены
     * @param {String} formula - строка с формулой
     */
    static getTokens(formula) {
        let tokens = [];
        let tokenCodes = formula
            .replace(/\s+/g, '') // очистка от пробельных символов
            .replace(/(?<=\d+),(?=\d+)/g, '.') // заменяет запятую на точку (для чисел)
            .replace(/^\-/g, '0-') // подставляет отсутсующий 0 для знака "-" в начале строки
            .replace(/\(\-/g, '(0-') // подставляет отсутсующий 0 для знака "-" в середине строки
            .replace(new RegExp(Token.sepPattern, 'g'), '&$&&') // вставка знака & перед разделителями
            .split('&') // разбиение на токены по символу &
            .filter((item) => item != ''); // удаление из массива пустых элементов

        tokenCodes.forEach(function (tokenCode) {
            if (tokenCode in Operators)
                tokens.push(new Token(Types.Operator, tokenCode));
            else if (tokenCode === '(')
                tokens.push(new Token(Types.LeftBracket, tokenCode));
            else if (tokenCode === ')')
                tokens.push(new Token(Types.RightBracket, tokenCode));
            else if (tokenCode === ';')
                tokens.push(new Token(Types.Semicolon, tokenCode));
            else if (tokenCode.toLowerCase().match(Token.funcPattern) !== null)
                tokens.push(new Token(Types.Function, tokenCode.toLowerCase()));
            else if (tokenCode.match(/^\d+[.]?\d*/g) !== null)
                tokens.push(new Token(Types.Number, Number(tokenCode)));
            else if (tokenCode.match(/^[A-Z]+[0-9]+/g) !== null)
                tokens.push(new Token(Types.Cell, tokenCode));
        });
        return tokens;
    }

    /**
     * Экранирование обратным слешем специальных символов
     * @param {String} str
     */
    static escape(str) {
        return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }
}
