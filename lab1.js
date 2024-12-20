class ExpressionAnalyzer {
  constructor() {
    this.transitions = {
      S: {
        OP: /^[+\-]$/,
        C: /^[0-9]$/,
        ID: /^[a-z]$/,
        OB: /^\($/,
      },
      OP: { ID: /^[a-z]$/, OB: /^\($/, C: /^[0-9]$/ },
      ID: {
        E: /^$/,
        ID: /^[a-zA-Z0-9_]*$/,
        FNOB: /^\($/,
        CB: /^\)$/,
        OP: /^[+\-*/]$/,
      },
      FNOB: {
        CB: /^\)$/,
        C: /^[0-9]$/,
        ID: /^[a-z]$/,
        OP: /^[+\-]$/,
      },
      OB: { ID: /^[a-z]$/, OP: /^[+\-]$/, C: /^[0-9]$/ },
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
      .map((regex) => regex.toString().replace(/[\^\[\]\$/\\]/g, ""))
      .join(", ");
  }

  analyzeExpression(expression) {
    expression = expression.replace(/\s+/g, "");
    let errors = [];
    for (let i = 0; i < expression.length; i++) {
      let symbol = expression[i];

      if (symbol === "0" && expression[i - 1] === "/") {
        errors.push({ position: i, message: `На 0 ділити не можна.` });
      }

      if (
        symbol === "0" &&
        !/[0-9]/.test(expression[i - 1]) &&
        expression[i - 1] !== "." &&
        /[0-9]/.test(expression[i + 1])
      ) {
        errors.push({
          position: i,
          message: `Числа не можуть починатися з 0.`,
        });
      }

      if (
        symbol === ")" &&
        this.statesHistory[this.statesHistory.length - 1].state === "OB"
      ) {
        errors.push({ position: i, message: `Не можна залишати пусті дужки.` });
      }

      if (symbol === "(") {
        this.openParentheses++;
      } else if (symbol === ")") {
        if (this.openParentheses === 0) {
          errors.push({ position: i, message: `Зайва закриваюча дужка.` });
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

        errors.push({
          position: i,
          message: `${template}. Очікувані символи: ${expected}`,
        });
      }
    }

    if (this.openParentheses > 0) {
      errors.push({
        position: expression.length - 1,
        message: `Недостатньо закриваючих дужок, всього: ${this.openParentheses}`,
      });
    }

    let finalState = this.matchTransition(this.currentState, "");
    if (finalState === "E") {
      this.statesHistory.push({ state: "E", symbol: "" });
    } else {
      const expected = this.expectedSymbols(this.currentState);
      errors.push({
        position: expression.length - 1,
        message: `Помилка завершення виразу. Очікувані символи: ${expected}`,
      });
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
    if (errors.length > 0) {
      console.log("\x1b[31m", `Вираз ${expression} є НЕкоректним.`, "\x1b[0m");

      let markedExpression = "";
      let errorIndicators = Array(expression.length).fill(" ");

      for (let i = 0; i < expression.length; i++) {
        if (errors.some((err) => err.position === i)) {
          markedExpression += `\x1b[31m${expression[i]}\x1b[0m`;
          errorIndicators[i] = "^";
        } else {
          markedExpression += expression[i];
        }
      }

      console.log("\n", markedExpression);
      console.log("\x1b[31m", errorIndicators.join(""), "\x1b[0m");
      console.log(" Помилки:");
      errors.forEach((error) =>
        console.log(`  - Позиція ${error.position}: ${error.message}`)
      );
      console.log("\n");
    } else {
      const mergedTokens = ExpressionAnalyzer.mergeTokens(this.statesHistory);
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
      console.log("\n");
    }
  }
}

const expressions = [
  // Valid expressions
  "-3+12*d/e-d*f2/cd*(a+2.2*4)",
  "-(b+c)+func1(1*baa+bj_ko2*(j-e))",
  "-a+b2*0-7",
  "g2*(b-17.3)+(6-cos(5))",
  "-(215.01+3122)+1-c",
];

expressions.forEach((expression) => {
  const analyzer = new ExpressionAnalyzer();
  analyzer.analyzeExpression(expression);
});
