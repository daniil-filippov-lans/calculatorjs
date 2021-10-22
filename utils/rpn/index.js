import Token from './token';
import { Types, Functions, Operators } from './const';
import Calculator from './calculator';

const formula = '1+1';

const calculator = new Calculator();
console.log(formula + ' = ' + calculator.calc(formula));
