'use strict';

var Expression = (new (function() {

  /**
    * Parse an expression
    * @param {string} expr
    * @param {boolean} [strict] If set to true, will not allow empty integer parts (e.g. ".5"). Default: false
    * @return {object} parsed
    */
  this.parse = function(expr, strict) {
    function _e(msg) {
      // TODO : Replace 'throw' by 'return'
      throw new Error('At ' + i + ' : ' + msg);
    }

    // TODO : Remove the '+0' part
    expr = expr.replace(/ +/g, '') + '+0';

    var buffInt = '', buffDec = '', floating = false, operator = '', numbers = [], $ = -1, get, parts = [];
    var char, p_buff = '', p_count = 0;

    for(var i = 0; i < expr.length; i++) {
      char = expr[i];

      if(char === '(') {
        if(buffInt || buffDec) {
          //if(strict)
            return _e('Opening parenthesis just after a number');
          //else
        }

        if(!p_count)
          p_buff = '';

        p_count += 1;
      } else if(char === ')') {
        if(!p_count)
          return _e('No parenthesis is opened');

        p_count -= 1;

        if(!p_count) {
          if(p_buff) {
            // parse content
            parts.push(this.parse(p_buff.substr(1), strict));

            if(parts[parts.length - 1] instanceof Error)
              return parts[parts.length - 1];

            buffInt = '$' + (++$);
          } else if(strict)
            return _e('No content between parenthesis');
          else {
            buffInt  = '0';
            floating = false;
          }
        }
      }

      if(p_count) {
        p_buff += char;
        continue ;
      }

      if('+-*/'.indexOf(char) !== -1) {
        // It's an operator
        if(!buffInt)
          return _e('Missing number before operator');

        if(floating && !buffDec)
          return _e('Missing decimal part of floating number');

        if(operator === '+' || operator === '-' || !operator)
          numbers.push(!floating ? buffInt : buffInt + '.' + buffDec);
        else { // operator === '*' || operator === '/'
          parts.push(numbers.splice(numbers.length - 2, 2).concat(!floating ? buffInt : buffInt + '.' + buffDec));
          numbers.push('$' + (++$));
        }

        numbers.push(char);
        operator = char;

        // Reset current number
        buffInt  = '';
        buffDec  = '';
        floating = false;
      } else if('0123456789'.indexOf(char) !== -1) {
        if(!floating)
          buffInt += char;
        else
          buffDec += char;
      } else if(char === '.') {
        if(floating)
          return _e('Can\'t use two times the "." symbol in a number');

        if(!buffInt) {
          if(strict)
            return _e('Missing integer part');

          buffInt = '0';
        }

        floating = true;
      }
    }

    if(p_count)
      return _e(p_count + ' parenthesis not closed');

    if(!buffInt)
      return _e('Missing number after operator');

    if(floating && !buffDec)
      return _e('Missing decimal part of floating number');

    numbers.push(!floating ? buffInt : buffInt + '.' + buffDec);

    return {numbers: numbers.slice(0, numbers.length - 2), parts: parts};
  };

  /**
    * Evaluate a parsed expression
    * @param {object} expr Parsed expresion from Expression.parse()
    * @return {number|Error}
    */
  this.eval = function(expr) {
    if(!expr || !Array.isArray(expr.numbers) || !Array.isArray(expr.parts))
      return new Error('Bad parsed expression');

    function eval_str(expr) {
      var a = (expr[0].substr(0, 1) === '$' ? parts[expr[0].substr(1)] : parseFloat(expr[0])),
          b = (expr[2].substr(0, 1) === '$' ? parts[expr[2].substr(1)] : parseFloat(expr[2]));

      if(expr[1] === '+')
        return a + b;
      else if(expr[1] === '-')
        return a - b;
      else if(expr[1] === '*')
        return a * b;
      else // expr[1] === '/'
        return a / b;
    }

    var parts = [];

    for(var i = 0; i < expr.parts.length; i++) {
      if(!Array.isArray(expr.parts[i])) {
        parts.push(this.eval(expr.parts[i]));

        if(parts[parts.length - 1] instanceof Error)
          return parts[parts.length - 1];
      } else
        parts.push(eval_str(expr.parts[i]));
    }

    var left = expr.numbers[0], right, operator;

    // NOTE : Here all operations are just '+' (add) or '-' (sub)
    for(i = 1; i < expr.numbers.length; i++) {
      if('+-'.indexOf(expr.numbers[i]) !== -1)
        operator = expr.numbers[i];
      else {
        right = expr.numbers[i];
        left  = eval_str([left.toString(), operator, right]);
      }
    }

    // TODO: Remove the '+0' part
    return eval_str([left.toString(), '+', '0']);
  };

  /**
    * Parse and evaluate an expression
    * @param {string} expr
    * @return {number|Error}
    */
  this.exec = function(expr) {
    var parsed = this.parse(expr);

    if(parsed instanceof Error)
      return parsed;

    return this.eval(parsed);
  };

})());