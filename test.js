
function assert(left, right, error) {
  if(left !== right)
    throw new Error(error);
}

if(typeof Expression !== 'object') {
  if(typeof require === 'function')
    var Expression = require('./expression.js');
  else
    throw new Error('This code must run with expression.js code');
}

assert(Expression.exec('2 + 10 / 2 * 2 + 8 * 2'), 28, 'Operations priority not working');
assert(Expression.exec('2 + ( 3 + 8 / 4 ) / 2'), 4.5, 'Parenthesis not working');
assert(Expression.exec('a / 3', {a: 36}), 12, 'Variables not working');
assert(Expression.exec('2 + double( 5 + double( 3 + double( 8 ) + 7 ) ) / 2', {double: function(s) { return s * 2; }}), 59, 'Functions not working');
assert(Expression.exec('"Hello" + " " + ( "World" + "Yoh" ) + toString( 2 )', {toString: function(s) { return s.toString(); }}), 'Hello WorldYoh2', 'Strings not working');
