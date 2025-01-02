import { ExpressionAnalyzer } from "./lab1.js";

// Клас виконує всі оптимізації, необхідні для спрощення та покращення паралелізму
class ExpressionOptimizer {
  constructor(tokens) {
    this.tokens = tokens;
    this.optimizations = [];
  }

  // Розбивання виразу на токени
  static tokenize(expression) {
    const regex = /[a-zA-Z_][a-zA-Z0-9_]*|\d+(\.\d+)?|[+\-*/()]/g;
    return expression.match(regex) || [];
  }

  // Пошук дужки, що закриває/відкриває передану
  findMatchedParens(index, tokens) {
    if (!tokens) {
      tokens = this.tokens.slice();
    }

    const isOpening = tokens[index] === "(";
    let balance = 0;
    const step = isOpening ? 1 : -1;

    for (let i = index; isOpening ? i < tokens.length : i >= 0; i += step) {
      if (tokens[i] === "(") balance += step;
      if (tokens[i] === ")") balance -= step;

      if (balance === 0) return i;
    }

    return -1;
  }

  // Спрощення операцій з нулем: -0, +0, *0, /0
  simplifyZero() {
    const handleZeroSimplification = (deletedTokens) => {
      this.optimizations.push(
        `Спрощення 0: видалено ${deletedTokens.join("")}`
      );
      return true;
    };

    for (let i = 0; i < this.tokens.length; i++) {
      if (+this.tokens[i] !== 0) continue;

      const prevToken = this.tokens[i - 1];
      const nextToken = this.tokens[i + 1];

      if (
        /^[+-]$/.test(prevToken) &&
        (/^[+-]$/.test(nextToken) || nextToken === undefined)
      ) {
        const deletedTokens = this.tokens.splice(i - 1, 2);
        handleZeroSimplification(deletedTokens);
        return true;
      }

      if (
        /^[+-]$/.test(nextToken) &&
        (/^[+-]$/.test(prevToken) || prevToken === undefined)
      ) {
        const deletedTokens = /^[-]$/.test(this.tokens[i + 1])
          ? this.tokens.splice(i, 1)
          : this.tokens.splice(i, 2);
        handleZeroSimplification(deletedTokens);

        return true;
      }

      if (/^[*]$/.test(prevToken)) {
        let deletedTokens;
        if (/^[)]$/.test(this.tokens[i - 2])) {
          const indexOpeningParen = this.findMatchedParens(i - 2);
          deletedTokens = this.tokens.splice(
            indexOpeningParen,
            i - indexOpeningParen
          );
        } else {
          deletedTokens = this.tokens.splice(i - 2, 2);
        }

        this.optimizations.push(
          `Спрощення 0: видалено ${deletedTokens.join("")}0`
        );

        return true;
      }

      if (/^[\/]$/.test(prevToken)) {
        throw new Error("Помилка ділення на 0");
      }

      if (/^[*\/]$/.test(nextToken)) {
        if (/^[(]$/.test(this.tokens[i + 2])) {
          const indexClosingParen = this.findMatchedParens(i + 2);
          const deletedTokens = this.tokens.splice(
            i + 1,
            indexClosingParen - i + 1
          );
          handleZeroSimplification(deletedTokens);
        } else {
          const deletedTokens = this.tokens.splice(i + 1, 2);
          handleZeroSimplification(deletedTokens);
        }
        return true;
      }
    }

    return false;
  }

  // Спрощення операцій з 1: *1, /1
  simplifyOne() {
    for (let i = 0; i < this.tokens.length; i++) {
      if (+this.tokens[i] === 1) {
        const prevToken = this.tokens[i - 1];
        const nextToken = this.tokens[i + 1];

        if (/^[*\/]$/.test(prevToken)) {
          const deletedTokens = this.tokens.splice(i - 1, 2);
          this.optimizations.push(
            `Спрощення 1: видалено ${deletedTokens.join("")}`
          );
          i -= 2;
          continue;
        }

        if (/^[*]$/.test(nextToken)) {
          const deletedTokens = this.tokens.splice(i, 2);
          this.optimizations.push(
            `Спрощення 1: видалено ${deletedTokens.join("")}`
          );
          i -= 1;
          continue;
        }
      }
    }

    return false;
  }

  // Розкривання дужок, починаючи з найбільш пріоритетних
  // Якщо перед дужками мінус - знаки в дужках інвертуються
  simplifyParentheses() {
    const findMaxDepth = (tokens) => {
      let depth = 0;
      let maxDepth = 0;

      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === "(") {
          depth++;
          maxDepth = Math.max(maxDepth, depth);
        } else if (tokens[i] === ")") {
          depth--;
        }
      }

      return maxDepth;
    };

    const maxDepth = findMaxDepth(this.tokens);
    let currentDepth = maxDepth;

    while (currentDepth > 0) {
      for (let i = 0; i < this.tokens.length; i++) {
        if (this.tokens[i] === "(") {
          let depth = 1;
          let start = i;

          for (let j = i + 1; j < this.tokens.length; j++) {
            if (this.tokens[j] === "(") depth++;
            if (this.tokens[j] === ")") depth--;

            if (depth === 0) {
              const end = j;
              if (this.isAtDepth(start, end, currentDepth)) {
                const prevToken = this.tokens[start - 1];
                const nextToken = this.tokens[end + 1];

                if (
                  (/^[+(]$/.test(prevToken) || prevToken === undefined) &&
                  (/^[+-]$/.test(nextToken) || nextToken === undefined)
                ) {
                  this.tokens.splice(end, 1);
                  this.tokens.splice(start, 1);
                  this.optimizations.push(
                    `Розкрито дужки навколо ${this.tokens
                      .slice(start, end)
                      .join("")}`
                  );
                  break;
                }

                if (
                  /^[-]$/.test(prevToken) &&
                  (/^[+-]$/.test(nextToken) || nextToken === undefined)
                ) {
                  const message = `Розкрито дужки навколо ${this.tokens
                    .slice(start + 1, end)
                    .join("")}, інвертовано знаки`;
                  this.tokens.splice(end, 1);
                  this.tokens.splice(start, 1);

                  for (let j = start; j < end - 1; j++) {
                    if (/^[+-]$/.test(this.tokens[j])) {
                      this.tokens[j] = this.tokens[j] === "+" ? "-" : "+";
                    }
                  }

                  if (/^[+]$/.test(this.tokens[start])) {
                    if (this.tokens[start - 2] === undefined) {
                      this.tokens.splice(start - 1, 2);
                    } else {
                      this.tokens.splice(start - 1, 1);
                    }
                  }

                  this.optimizations.push(message);
                  break;
                }
              }
              break;
            }
          }
        }
      }

      currentDepth--;
    }

    return false;
  }

  // Перевіряє належність переданої пари дужок відповідному рівню вкладеності
  isAtDepth(start, end, depth) {
    let currentDepth = 0;

    for (let i = 0; i < this.tokens.length; i++) {
      if (this.tokens[i] === "(") {
        currentDepth++;
      } else if (this.tokens[i] === ")") {
        currentDepth--;
      }

      if (i === start) {
        if (currentDepth === depth) return true;
      }
    }

    return false;
  }

  // Обчислює дві константи розділені операцією, якщо це можливо
  calculateConstants() {
    const roundResult = (num) => {
      return Math.round(num * 1e10) / 1e10;
    };

    // Обчислення */ з вищим пріоритетом
    for (let i = 0; i < this.tokens.length; i++) {
      if (/^[*/]$/.test(this.tokens[i])) {
        const num1 = +this.tokens[i - 1];
        const operator = this.tokens[i];
        const num2 = +this.tokens[i + 1];

        if (
          typeof num1 === "number" &&
          typeof num2 === "number" &&
          !isNaN(num1) &&
          !isNaN(num2)
        ) {
          if (operator === "/" && num2 === 0) {
            throw new Error("Помилка: ділення на 0");
          }

          let result = operator === "*" ? num1 * num2 : num1 / num2;
          result = roundResult(result);
          this.tokens.splice(i - 1, 3, result.toString());
          this.optimizations.push(
            `Обчислено ${num1} ${operator} ${num2} = ${result}`
          );
          i -= 1;
        }
      }
    }

    // Обчислення +- з нижчим пріоритетом
    for (let i = 0; i < this.tokens.length; i++) {
      if (/^[+-]$/.test(this.tokens[i])) {
        const num1 = +this.tokens[i - 1];
        const operator = this.tokens[i];
        const num2 = +this.tokens[i + 1];

        if (
          typeof num1 === "number" &&
          typeof num2 === "number" &&
          !isNaN(num1) &&
          !isNaN(num2)
        ) {
          let result = operator === "+" ? num1 + num2 : num1 - num2;
          result = roundResult(result);
          if (result < 0 && /^[+-]$/.test(this.tokens[i - 2])) {
            if (this.tokens[i - 2] == "+") {
              this.tokens.splice(i - 2, 1, "-");
            } else {
              this.tokens.splice(i - 2, 1, "+");
            }
            result *= -1;
          }
          this.tokens.splice(i - 1, 3, result.toString());
          if (/^[-]$/.test(this.tokens[i - 2])) {
            this.optimizations.push(
              `Обчислено ${num1} ${operator} ${num2} = ${
                this.tokens[i - 2]
              }${result}`
            );
          } else {
            this.optimizations.push(
              `Обчислено ${num1} ${operator} ${num2} = ${result}`
            );
          }

          i -= 1;
        }
      }
    }

    return false;
  }

  // Групування двох операнд і операції між ними в дужки для найкращої паралельності
  // Де необхідно, ділення замінюється множенням, а віднімання додаванням, щоб взяти операнди в дужки
  // На наступних ітераціях групуються уже згруповані операнди, допоки кількість операндів більше 1
  // У результаті отримається список токенів з заміненими операціями і пріоритетністю дужок, виграємо паралельність
  groupTwoTermsInParens() {
    let tokens = this.tokens.slice();

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === "(") {
        const matchedParen = this.findMatchedParens(i, tokens);
        const groupedToken = tokens.slice(i, matchedParen + 1).join("");
        tokens.splice(i, matchedParen - i + 1, groupedToken);
      }
    }

    while (tokens.length > 1) {
      let modified = false;

      for (let i = 0; i < tokens.length; i++) {
        if (!["+", "-", "*", "/"].includes(tokens[i])) {
          const token1 = tokens[i];
          let operatorIndex = i + 1;

          if (
            operatorIndex < tokens.length &&
            ["+", "-", "*", "/"].includes(tokens[operatorIndex])
          ) {
            const operator = tokens[operatorIndex];
            const token2Index = operatorIndex + 1;

            if (token2Index < tokens.length) {
              const token2 = tokens[token2Index];
              let shouldSkip = false;
              let newOperator = operator;

              if (operator === "+") {
                if (
                  (i > 0 && ["*", "/"].includes(tokens[i - 1])) ||
                  (token2Index + 1 < tokens.length &&
                    ["*", "/"].includes(tokens[token2Index + 1]))
                ) {
                  shouldSkip = true;
                }
              } else if (operator === "-") {
                if (
                  (i > 0 && ["*", "/"].includes(tokens[i - 1])) ||
                  (token2Index + 1 < tokens.length &&
                    ["*", "/"].includes(tokens[token2Index + 1]))
                ) {
                  shouldSkip = true;
                } else {
                  if (i > 0 && tokens[i - 1] === "-") {
                    newOperator = "+";
                  } else {
                    newOperator = "-";
                  }
                }
              } else if (operator === "*") {
                if (i > 0 && tokens[i - 1] === "/") {
                  newOperator = "/";
                }
              } else if (operator === "/") {
                if (i > 0 && ["+", "-"].includes(tokens[i - 1])) {
                  newOperator = "/";
                } else if (i > 0 && tokens[i - 1] === "*") {
                  newOperator = "/";
                } else if (i > 0 && tokens[i - 1] === "/") {
                  newOperator = "*";
                }
              }

              if (!shouldSkip) {
                // Перевірка на наявність правильних попередніх значень
                const prevToken = i > 0 ? tokens[i - 1] : "";
                const prevOperation = `${prevToken}${tokens[i]}${
                  tokens[i + 1]
                }${tokens[i + 2]}`;
                const groupedToken = `(${token1}${newOperator}${token2})`;

                // Заміняємо на новий вираз в дужках
                tokens.splice(i, 3, groupedToken);
                modified = true;
                i = token2Index - 1;

                // Додаємо лог з описом заміни
                this.optimizations.push(
                  `Групування операндів: ${prevOperation} -> ${prevToken}${groupedToken}`
                );
              }
            }
          }
        }
      }

      if (!modified) {
        break;
      }
    }

    this.tokens = ExpressionOptimizer.tokenize(tokens[0]);
  }

  // Оптимізації виконуються до тих пір, допоки вираз зазнає змін
  optimize() {
    let changes = true;
    while (changes) {
      changes =
        this.simplifyZero() ||
        this.simplifyOne() ||
        this.simplifyParentheses() ||
        this.calculateConstants();
    }

    this.groupTwoTermsInParens();

    return this.tokens;
  }
}

// Клас ExpressionParser розбиває вираз на токени, проводить оптимізації,
// перетворює вираз у постфіксну форму та будує абстрактне дерево виразу
class ExpressionParser {
  constructor(expression) {
    this.expression = expression;
    this.tokens = [];
    this.postfix = [];
    this.optimizations = [];
  }

  // Перевірка валідності виразу з Лаб 1
  validateExpression() {
    const analyzer = new ExpressionAnalyzer();
    analyzer.analyzeExpression(this.expression);
    if (analyzer.errors.length > 0) {
      const message = `Вираз не є валідним: ${analyzer.errors
        .map((err) => err.message)
        .join(", ")}`;
      throw new Error(message);
    }
  }

  // Запуск оптимізацій з ExpressionOptimizer
  optimize() {
    const optimizer = new ExpressionOptimizer(this.tokens);
    this.tokens = optimizer.optimize();
    this.optimizations = optimizer.optimizations;
  }

  // Перетворення в постфіксну форму
  toPostfix() {
    const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };
    const stack = [];

    for (const token of this.tokens) {
      if (/^[a-zA-Z_][a-zA-Z0-9_]*|\d+(\.\d+)?$/.test(token)) {
        this.postfix.push(token);
      } else if (token === "(") {
        stack.push(token);
      } else if (token === ")") {
        while (stack.length && stack[stack.length - 1] !== "(") {
          this.postfix.push(stack.pop());
        }
        stack.pop();
      } else {
        while (
          stack.length &&
          precedence[stack[stack.length - 1]] >= precedence[token]
        ) {
          this.postfix.push(stack.pop());
        }
        stack.push(token);
      }
    }

    while (stack.length) {
      this.postfix.push(stack.pop());
    }
  }

  // Побудова дерева виразу
  buildTree() {
    const stack = [];

    for (const token of this.postfix) {
      if (/^[a-zA-Z_][a-zA-Z0-9_]*|\d+(\.\d+)?$/.test(token)) {
        stack.push({ value: token, left: null, right: null });
      } else {
        const right = stack.pop();
        const left = stack.pop();
        stack.push({ value: token, left, right });
      }
    }

    return stack.pop();
  }

  // Рекурсивний вивід дерева у вигляді тексту
  printTree(node, level = 0) {
    if (node.right) this.printTree(node.right, level + 1);
    console.log(" ".repeat(4 * level) + "-> " + node.value);
    if (node.left) this.printTree(node.left, level + 1);
  }

  // Логування результатів
  logResults() {
    console.log("Перевірка валідності виразу:");
    this.validateExpression();

    this.tokens = ExpressionOptimizer.tokenize(this.expression);
    console.log("Токени:", this.tokens);

    this.optimize();
    console.log("Оптимізовані токени:", this.tokens);
    console.log("Виконані оптимізації:", this.optimizations);

    this.toPostfix();

    const tree = this.buildTree();
    console.log("Дерево виразу:");
    this.printTree(tree);
  }
}

// Тестування
const inputExpressions = [
  "a+b+c+d+e+f+g+h",
  "a-b-c-d-e-f-g-h",
  "a/b/c/d/e/f/g/h",
  "a*(b-4)-2*b*c-c*d-a*c*d/e/f/g-g-h-i-j",
  "a+(b+c+d+(e+f)+g)+h",
  "a-((b-c-d)-(e-f)-g)-h",
  "5040/8/7/6/5/4/3/2",
  "64-(32-16)-8-(4-2-1)",
  "-(-i)/1.0 + 0-0*k*h+ 2-4.8/2 + 1*e/2",
  "1/(c*2*4.76*(1-2+1))",
];
inputExpressions.forEach((expression) => {
  const parser = new ExpressionParser(expression);
  parser.logResults();
});
