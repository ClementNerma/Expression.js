'use strict';

var Expression = (new (function() {

  /**
    * Parse an expression
    * @param {string} expr
    * @param {boolean} [strict] If set to true, will not allow empty integer parts (e.g. ".5"). Default: false
    * @return {object} parsed
    */
  this.parse = function(expr, strict, numExp, strExp, fullExpr, startI) {
    function _e(msg) {
      var k = i + (startI || -1) + 1; // 'i' starts from 0
      return new Error('At column ' + k + ' : ' + msg + '\n' + (fullExpr || expr).substr(0, (fullExpr || expr).length - 1).substr(Math.max(0, k - 25), k + 25) + '\n' + ' '.repeat(k - Math.max(0, k - 25)) + '^');
    }

    var buffInt = '', buffDec = '', floating = false, operator = '', numbers = [], $ = -1, get, parts = [];
    var char, p_buff = '', p_count = 0, buffLetter = '', functionCall = null, functionIndex = 0, callBuffs = [], j,
        buffString = '', stringOpened = false;

    expr += '+';

    for(var i = 0; i < expr.length; i++) {
      char = expr[i];

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
          callBuffs.push(p_buff);

          for(j = 0; j < callBuffs.length; j++) {
            get = this.parse(callBuffs[j], strict, undefined, undefined, expr, i - p_buff.length);

            if(get instanceof Error)
              return get;

            if(get.numbers.length === 1 && get.numbers[0].substr(0, 1) !== '$')
              // Optimization
              callBuffs[j] = get.numbers[0];
            else {
              callBuffs[j] = '$' + (++$);
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

            if(get.numbers.length === 1 && get.numbers[0].substr(0, 1) !== '$')
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

        /*// Fully optimized lines
        stringOpened = !stringOpened;
        buffString  += '"';

        /* Not-optimized equivalent code :

        if(stringOpened) {
          stringOpened = false;
          buffString  += '"';
        } else {
          stringOpened = true;
          buffString   = '"';
        }*/

        continue ;
      } else
        return _e('Syntax error : Unknown symbol');
    }

    if(p_count)
      return _e(p_count + ' parenthesis not closed');

    numbers.push(!floating ? buffInt : buffInt + '.' + buffDec);

    var ret = {numbers: numbers.slice(0, numbers.length - 2), parts: parts};
    if(strExp) ret.strExp = true;

    return ret;
  };

  /**
    * Evaluate a parsed expression
    * @param {object} expr Parsed expresion from Expression.parse()
    * @param {object} [vars] Variables
    * @return {number}
    */
  this.eval = function(expr, vars) {
    if(!expr || !Array.isArray(expr.numbers) || !Array.isArray(expr.parts))
      throw new Error('Bad parsed expression');

    vars = vars || {};

    function eval_num(e) {
      if(e.substr(0, 1) === '$')
        return parts[e.substr(1)];
      else if(e.substr(0, 1) === '"' && e.substr(-1) === '"') {
        last_is_str = true;
        return e.substr(1, e.length - 2);
      } else {
        var a = parseFloat(e);

        if(Number.isNaN(a)) {
          // It's a name
          if(vars.hasOwnProperty(e))
            a = parseFloat(vars[e]);
          else
            throw new Error('Variable doesn\'t exist : "' + e + '"');
        } else
          return a;
      }
    }

    function eval_str(expr) {
      var a = eval_num(expr[0]), b = eval_num(expr[2]);

      if(expr[1] === '+')
        return a + b;
      else if(expr[1] === '-')
        return a - b;
      else if(expr[1] === '*')
        return a * b;
      else // expr[1] === '/'
        return a / b;
    }

    var parts = [], args, j, part, last_is_str;

    for(var i = 0; i < expr.parts.length; i++) {
      if(!Array.isArray(expr.parts[i])) {
        if(expr.parts[i].function) {
          // Function call
          part = expr.parts[i];

          if(!vars.hasOwnProperty(part.function))
            throw new Error('Function "' + part.function + '" is not defined');

          if(typeof vars[part.function] !== 'function')
            throw new Error('"' + part.function + '" is not a function');

          args = [];

          for(j = 0; j < part.arguments.length; j++)
            args.push(eval_num(part.arguments[j]));

          parts.push(eval_num(vars[part.function].apply(vars, args).toString()));
        } else {
          // Sub-parsed expression
          parts.push(this.eval(expr.parts[i], vars));

          if(parts[parts.length - 1] instanceof Error)
            return parts[parts.length - 1];
        }
      } else
        parts.push(eval_str(expr.parts[i]));
    }

    var left = eval_num(expr.numbers[0]), operator;

    // NOTE : Here all operations are just '+' (add) or '-' (sub)
    for(i = 1; i < expr.numbers.length; i++) {
      if('+-'.indexOf(expr.numbers[i]) !== -1)
        operator = expr.numbers[i];
      else
        left  = expr.strExp ? left + eval_num(expr.numbers[i]) : eval_str([left.toString(), operator, expr.numbers[i]]);
    }

    return expr.strExp ? left : eval_num(left.toString());
  };

  /**
    * Parse and evaluate an expression
    * @param {string} expr
    * @param {object} [vars]
    * @param {boolean} [strict]
    * @return {number|Error}
    */
  this.exec = function(expr, vars, strict) {
    var parsed = this.parse(expr, strict);

    if(parsed instanceof Error)
      return parsed;

    return this.eval(parsed, vars);
  };

})());
