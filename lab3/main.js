import { ExpressionParser } from "../lab2.js";
import { VectorSystem } from "./VectorSystem.js";

// Лаб 1-2
const expression = "((a+b)+(c-d))+((e*f)+(g/h))";
// const expression = "((a+b)+(c+d))+(e+b)";
// const expression = "a*b*c*d*e*b";
// const expression = "((a/b)+(c-d))+(a+b)*(c+d)-(a+b)";
// const expression = "a+b-c*d/c/d";
const parser = new ExpressionParser(expression);
const tree = parser.parse();

// Паралельне обчислення
const vectorSystem = new VectorSystem(tree, "parallel");
console.log(vectorSystem.unprocessedTasks);
vectorSystem.processComputation();

// Визначення часу послідовного обчислення
const sequentiveExecution = new VectorSystem(tree, "sequentive");
sequentiveExecution.processComputation();

// Запис результатів у файл
vectorSystem.writeDataToJson(expression, tree, sequentiveExecution.getTime());
