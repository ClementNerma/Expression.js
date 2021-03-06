'use strict';

let Expression = (new (function() {

  /**
    * Parse an expression
    * @param {string} expr
    * @param {boolean} [strict] If set to true, will not allow empty integer parts (e.g. ".5"). Default: false
    * @return {object} parsed
    */
  this.parse = function(expr, strict, numExp, strExp, fullExpr, startI) {
    function _e(msg) {
      let k = i + (startI || -1) + 1; // 'i' starts from 0
      return new Error('At column ' + k + ' : ' + msg + '\n' + (fullExpr || expr).substr(0, (fullExpr || expr).length - 1).substr(Math.max(0, k - 25), k + 25) + '\n' + ' '.repeat(k - Math.max(0, k - 25)) + '^');
    }

    let buffInt = '', buffDec = '', floating = false, operator = '', numbers = [], $ = -1, get, parts = [];
    let char, p_buff = '', p_count = 0, buffLetter = '', functionCall = null, functionIndex = 0, callBuffs = [], j,
        buffString = '', stringOpened = false;

    expr += '+';

    for(let char of expr) {
      if(char === '(') {
        if(p_count) {
          p_count += 1;
          p_buff  += '(';
          continue ;
        }

        if(buffInt || buffDec)
          return _e('Opening parenthesis just after a number');

        if(buffString)
          return _e('Opening parenthesis just after a string');

        if(buffLetter) {
          functionCall  = buffLetter;
          functionIndex = p_count + 1;
        }

        if(!p_count)
          p_buff = '';

        p_count += 1;

        if(p_count === 1)
          continue ;
      } else if(char === ')') {
        if(functionCall && p_count === functionIndex) {
          if(p_buff) // Fix a bug when script calls a function without any argument
            callBuffs.push(p_buff);

          let i = 0;

          for(let buff of callBuffs) {
            get = this.parse(buff, strict, undefined, undefined, expr, ++i - p_buff.length);

            if(get instanceof Error)
              return get;

            if(get.numbers.length === 1 && !get.numbers[0].startsWith('$'))
              // Optimization
              buff = get.numbers[0];
            else {
              buff = '$' + (++$);
              parts.push(!get.parts.length ? get.numbers : get);
            }
          }

          parts.push({ function: functionCall, arguments: callBuffs });
          functionCall = null;
          buffInt      = '$' + (++$);
          buffLetter   = '';
          floating     = false;
          p_count     -= 1;
          continue ;
        }

        if(!p_count)
          return _e('No parenthesis is opened');

        p_count -= 1;

        if(!p_count) {
          if(p_buff) {
            // parse content
            get = this.parse(p_buff, strict, numExp, strExp, expr, i - p_buff.length);

            if(get instanceof Error)
              return get;

            if(get.numbers.length === 1 && !get.numbers[0].startsWith('$'))
              // Optimization
              buffInt = get.numbers[0];
            else {
              buffInt = '$' + (++$);
              parts.push(!get.parts.length ? get.numbers : get);
            }

            continue ;
          } else if(strict)
            return _e('No content between parenthesis');
          else {
            buffInt    = '0';
            /*buffLetter = '';
            buffString = '"';*/
            floating   = false;
          }
        }
      } else if(functionCall && char === ',') {
        callBuffs.push(p_buff);
        p_buff = '';
        continue ;
      }

      if(p_count) {
        p_buff += char;
        continue ;
      }

      if(char === '"' && stringOpened) {
        stringOpened = false;
        buffString  += '"';
        continue ;
      }

      if(stringOpened) {
        buffString += char;
        continue ;
      }

      if(char === ' ')
        continue ;

      if('+-*/'.indexOf(char) !== -1) {
        // It's an operator
        if(!buffInt && !buffLetter && !buffString)
          return _e('Missing number before operator');

        if(floating && !buffDec)
          return _e('Missing decimal part of floating number');

        if(buffInt) numExp = true;
        if(buffString) strExp = true;

        if(strExp && char !== '+')
          return _e('Only the "+" operator is allowed in string expressions');

        if(operator === '+' || operator === '-' || !operator)
          numbers.push(buffString || buffLetter || (!floating ? buffInt : buffInt + '.' + buffDec));
        else { // operator === '*' || operator === '/'
          parts.push(numbers.splice(numbers.length - 2, 2).concat(buffString || buffLetter || (!floating ? buffInt : buffInt + '.' + buffDec)));
          numbers.push('$' + (++$));
        }

        numbers.push(char);
        operator = char;

        // Reset current number
        buffInt    = '';
        buffDec    = '';
        buffLetter = '';
        buffString = '';
        floating   = false;
      } else if('0123456789'.indexOf(char) !== -1) {
        if(buffLetter)
          return _e('Can\'t use numbers into a name');

        if(strExp)
          return _e('Can\'t put a number into a string expression');

        if(!floating)
          buffInt += char;
        else
          buffDec += char;
      } else if(char === '.') {
        if(floating)
          return _e('Can\'t use two times the "." symbol in a number');

        if(buffString)
          return _e('Can\'t use the "." symbol after a string');

        if(buffLetter)
          return _e('Can\'t use the "." symbol after a name');

        if(!buffInt) {
          if(strict)
            return _e('Missing integer part');

          buffInt = '0';
        }

        floating = true;
      } else if(char.match(/[a-zA-Z_]/)) {
        if(buffInt)
          return _e('Can\'t use letters into a number');

        buffLetter += char;
      } else if(char === '"') {
        if(numExp)
          return _e('Can\'t put a string into a numeric expression');

        stringOpened = true;
        buffString   = '"';

        continue ;
      } else
        return _e('Syntax error : Unknown symbol');
    }

    if(p_count)
      return _e(p_count + ' parenthesis not closed');

    numbers.push(!floating ? buffInt : buffInt + '.' + buffDec);

    let ret = {numbers: numbers.slice(0, numbers.length - 2), parts: parts};
    if(strExp) ret.strExp = true;

    return ret;
  };

  /**
    * Evaluate a parsed expression
    * @param {object} expr Parsed expresion from Expression.parse()
    * @param {object} [vars] Variables
    * @param {boolean} [noLib] If set to true, won't include the main library functions (like cos, sin, round...). Default: false
    * @return {number}
    */
  this.eval = function(expr, vars, noLib) {
    if(!expr || !Array.isArray(expr.numbers) || !Array.isArray(expr.parts))
      throw new Error('Bad parsed expression');

    vars = vars || {};

    if(!noLib) {
      for(let key of ExpressionLibraryKeys)
        vars[key] = ExpressionLibrary[key];
    }

    function eval_num(e) {
      if(e.startsWith('$'))
        return ((['number', 'string']).indexOf(typeof parts[e.substr(1)]) !== -1) ? parts[e.substr(1)] : eval_str(parts[e.substr(1)]);
      else if(e.startsWith('"') && e.endsWith('"')) {
        last_is_str = true;
        return e.substr(1, e.length - 2);
      } else {
        let a = parseFloat(e);

        if(Number.isNaN(a)) {
          // It's a name
          if(vars.hasOwnProperty(e)) {
            return parseFloat(vars[e]);
          } else
            throw new Error('Variable doesn\'t exist : "' + e + '"');
        } else
          return a;
      }
    }

    function eval_str(expr) {
      let a = eval_num(expr[0]), b = eval_num(expr[2]);

      if(expr[1] === '+')
        return a + b;
      else if(expr[1] === '-')
        return a - b;
      else if(expr[1] === '*')
        return a * b;
      else // expr[1] === '/'
        return a / b;
    }

    let parts = [], args, part, last_is_str;

    for(let part of expr.parts) {
      if(!Array.isArray(part)) {
        if(part.function) {
          // Function call
          part = part;

          if(!vars.hasOwnProperty(part.function))
            throw new Error('Function "' + part.function + '" is not defined');

          if(typeof vars[part.function] !== 'function')
            throw new Error('"' + part.function + '" is not a function');

          args = [];

          for(let j = 0; j < part.arguments.length; j++)
            args.push(eval_num(part.arguments[j]));

          //parts.push(eval_num(vars[part.function].apply(vars, args).toString()));
          parts.push(vars[part.function].apply(vars, args));
        } else {
          // Sub-parsed expression
          parts.push(this.eval(part, vars));

          if(parts[parts.length - 1] instanceof Error)
            return parts[parts.length - 1];
        }
      } else
        parts.push(eval_str(part));
    }

    let left = eval_num(expr.numbers[0]), operator;

    // NOTE : Here all operations are just '+' (add) or '-' (sub)
    for(let i = 1; i < expr.numbers.length; i++) {
      if('+-'.indexOf(expr.numbers[i]) !== -1)
        operator = expr.numbers[i];
      else
        left = expr.strExp ? left + eval_num(expr.numbers[i]) : eval_str([left.toString(), operator, expr.numbers[i]]);
    }

    return expr.strExp ? left : eval_num(left.toString());
  };

  /**
    * Parse and evaluate an expression
    * @param {string} expr
    * @param {object} [vars]
    * @param {boolean} [strict]
    * @param {boolean} [noLib]
    * @return {number|Error}
    */
  this.exec = function(expr, vars, strict, noLib) {
    let parsed = this.parse(expr, strict);

    if(parsed instanceof Error)
      return parsed;

    return this.eval(parsed, vars);
  };

})());

let ExpressionLibrary = {
  abs   : function(n) { return Math.abs(n); },
  acos  : function(n) { return Math.acos(n); },
  acosh : function(n) { return Math.acosh(n); },
  asin  : function(n) { return Math.asin(n); },
  asinh : function(n) { return Math.asinh(n); },
  atan  : function(n) { return Math.atan(n); },
  atan2 : function(n) { return Math.atan2(n); },
  atanh : function(n) { return Math.atanh(n); },
  cbrt  : function(n) { return Math.cbrt(n); },
  ceil  : function(n) { return Math.ceil(n); },
  cos   : function(n) { return Math.cos(n); },
  cosh  : function(n) { return Math.cosh(n); },
  floor : function(n) { return Math.floor(n); },
  log   : function(n) { return Math.log(n); },
  log10 : function(n) { return Math.log10(n); },
  log1p : function(n) { return Math.log1p(n); },
  log2  : function(n) { return Math.log2(n); },
  random: function(n) { return Math.random(); },
  sign  : function(n) { return Math.sign(n); },
  sin   : function(n) { return Math.sin(n); },
  sinh  : function(n) { return Math.sinh(n); },
  sqrt  : function(n) { return Math.sqrt(n); },
  tan   : function(n) { return Math.tan(n); },
  tanh  : function(n) { return Math.tanh(n); },
  trunc : function(n) { return Math.trunc(n); },
  max   : function(n1, n2) { return n1 > n2 ? n1 : n2; },
  min   : function(n1, n2) { return n1 < n2 ? n1 : n2 },
  pow   : function(n, pow) { return Math.pow(n, pow); },

  // Added features
  randomInt : function(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  randomBool: function() { return (Math.random() > 0.5) ? 1 : 0; },
  substr    : function(str, min, max) { return '"' + ((typeof max !== 'undefined') ? str.substr(min, max) : str.substr(min)) + '"'; },
  uppercase : function(str) { return '"' + str.toLocaleUpperCase() + '"'; },
  lowercase : function(str) { return '"' + str.toLocaleLowerCase() + '"'; }
}, ExpressionLibraryKeys = Object.keys(ExpressionLibrary);

if(typeof module === 'object' && typeof module.exports === 'object')
  module.exports = Expression;
