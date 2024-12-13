class ExpressionAnalyzer {
  constructor() {
    this.transitions = {
      S: { OP: /^[+\-]$/, C: /^[0-9]$/, "V/FN": /^[a-z]$/, OB: /^\($/ },
      OP: { "V/FN": /^[a-z]$/, OB: /^\($/, C: /^[0-9]$/ },
      "V/FN": {
        "V/FN": /^[a-zA-Z0-9_]*$/,
        FNOB: /^\($/,
        CB: /^\)$/,
        E: /^$/,
        OP: /^[+\-*/]$/,
      },
      FNOB: { CB: /^\)$/, C: /^[0-9]$/, "V/FN": /^[a-z]$/, OP: /^[+\-]$/ },
      OB: { "V/FN": /^[a-z]$/, OP: /^[+\-]$/, C: /^[0-9]$/ },
      CB: { CB: /^\)$/, E: /^$/, OP: /^[+\-*/]$/ },
      C: { E: /^$/, OP: /^[+\-*/]$/, CD: /^\.$/, CB: /^\)$/, C: /^[0-9]$/ },
      CD: { CDC: /^[0-9]$/ },
      CDC: { OP: /^[+\-*/]$/, CDC: /^[0-9]$/, CB: /^\)$/, E: /^$/ },
    };
    this.currentState = "S";
    this.statesHistory = [{ state: this.currentState, symbol: "" }];
    this.openParentheses = 0;
  }

  matchTransition(state, symbol) {
    for (let nextState in this.transitions[state]) {
      if (this.transitions[state][nextState].test(symbol)) {
        return nextState;
      }
    }
    return null;
  }

  expectedSymbols(state) {
    return Object.values(this.transitions[state])
      .map((regex) => regex.toString().replace(/[\^\[\]\$\\/]/g, ""))
      .join(", ");
  }

  analyzeExpression(expression) {
    expression = expression.replace(/\s+/g, "");
    let errors = [];
    for (let i = 0; i < expression.length; i++) {
      let symbol = expression[i];

      if (
        symbol === ")" &&
        this.statesHistory[this.statesHistory.length - 1].state === "OB"
      ) {
        errors.push(`Позиція: ${i}. Не можна залишати пусті дужки.`);
      }

      if (symbol === "(") {
        this.openParentheses++;
      } else if (symbol === ")") {
        if (this.openParentheses === 0) {
          errors.push(`Позиція: ${i}. Зайва закриваюча дужка.`);
        } else {
          this.openParentheses--;
        }
      }

      let nextState = this.matchTransition(this.currentState, symbol);

      if (nextState) {
        this.currentState = nextState;
        this.statesHistory.push({ state: this.currentState, symbol });
      } else {
        const expected = this.expectedSymbols(this.currentState);
        let template =
          i !== 0 ? `Неочікуваний символ` : "Неправильний початок виразу";

        errors.push(
          `Позиція: ${i}. ${template}. Очікувані символи: ${expected}`
        );
      }
    }

    if (this.openParentheses > 0) {
      errors.push(
        `Недостатньо закриваючих дужок, всього: ${this.openParentheses}`
      );
    }

    let finalState = this.matchTransition(this.currentState, "");
    if (finalState === "E") {
      this.statesHistory.push({ state: "E", symbol: "" });
    } else {
      const expected = this.expectedSymbols(this.currentState);
      errors.push(
        `Позиція: ${expression.length}. Помилка завершення виразу. Очікувані символи: ${expected}`
      );
    }

    this.printResults(expression, errors);
  }

  static mergeTokens(history) {
    const merged = [];
    for (let i = 0; i < history.length; i++) {
      const { state, symbol } = history[i];
      if (merged.length > 0 && merged[merged.length - 1].state === state) {
        merged[merged.length - 1].symbol += symbol;
      } else {
        merged.push({ state, symbol });
      }
    }
    return merged;
  }

  printResults(expression, errors) {
    const mergedTokens = ExpressionAnalyzer.mergeTokens(this.statesHistory);

    if (errors.length > 0) {
      console.log("\x1b[31m", `Вираз ${expression} є НЕкоректним.`, "\x1b[0m");
      console.log(" Помилки:");
      errors.forEach((error) => console.log("  - ", error));
    } else {
      console.log(
        "\x1b[32m",
        `Вираз ${expression} синтаксично коректний.`,
        "\x1b[0m"
      );
      console.log(" Токени:");
      mergedTokens.forEach(({ state, symbol }, index) => {
        if (index !== 0 && index !== mergedTokens.length - 1) {
          process.stdout.write(` ${state}(${symbol})`);
        }
      });
    }
    console.log("\n");
  }
}

const expressions = [
  // Valid expressions
  "3.15 + 4545.313",
  "3 + 5",
  "x * (y + 2)",
  "sin(x) + cos(y)",
  "2 * (3 + 4) / 5",
  "sqrt(a) - log(b)",
  "(x + y) * (z - w)",
  "3 + 5 * (2 - 4)",
  "x / (y - z) * a",
  "abs(-5) + round(4.67)",
  "log(10) + sqrt(16)",
  "+ 7 * 8",
  "- (3 + 5)",
  // Invalid expressions - starts with invalid characters
  "* 3 + 5",
  "/ 2 - 1",
  ") x + 5",
  // Invalid expressions - ends with invalid characters
  "3 + 5 *",
  "(x - y /",
  "sqrt(16) +",
  "(a + b -",
  // Invalid expressions - mismatched brackets
  "3 + (4 - 5",
  "(2 + 3)) * 7",
  "(x * (y + z)",
  "((a - b) + c",
  "log(10 + sqrt(25)) + abs(x",
  // Invalid expressions - empty brackets
  "x * () + 5",
  "(3 + ) * 4",
  "*lgh_2()+3",
];

expressions.forEach((expression) => {
  const analyzer = new ExpressionAnalyzer();
  analyzer.analyzeExpression(expression);
});
