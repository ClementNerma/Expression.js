
# Expression.js

Expression.js is an expression parser which permit to make and evaluate mathematical expressions using variables and functions.

## How to use

First, download the main *expression.js* file. Then, include it in your HTML page :

```html
<script type="text/javascript" src="expression.js"></script>
```

Or in your Node.js script :

```js
var Expression = require('./expression.js');
```

## Features

### Simple Operations

Here is a code sample :

```javascript
var parsed = Expression.parse('2 + 8 / 5'); // Parse the expression
// Do some stuff here...
var result = Expression.eval(result);       // And evaluate it

// ==== OR ====
var result = Expression.exec('2 + 8 / 5');
```

The point of parsing an expression before evaluating it is performances.
If you have to evaluate multiple expressions at a time, you can parse it at the beginning of your task, and then evaluate it.
**NOTE :** The longest part is the parsing.

### Variables

You can also use variables, like :

```javascript
Expression.exec('2 + 8 / (6 + 2)', {a: 5}); // Output: 3
```

If you want to prepare the expression before running it, do :

```javascript
var parsed = Expression.parse('2 + 8 / (6 + 2)');
// Do some stuff...
Expression.eval(parsed, {a: 5}); // Output: 3
```

### Strings

Expressions can contain only numbers or only strings. If you want to use strings, your code should be :

```javascript
Expression.exec('"Hello" + "World"');
```

You MUST use the " symbol to define strings. The ' symbol will not work.
**NOTE :** Only the '+' operator works in this context. The '-' '*' '/' operators *does not* work.

### Functions

Now, let's see how the functions works. If you want, for example, to use the **cube** function, do :

```javascript
Expression.exec('3 * cube(5) / 10', { cube: function(n) { return n * n * n; } }); // Output: 37.5
```

You can also use cosine functions, round...
