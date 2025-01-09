import { DataBank } from "./DataBank.js";
import { CalculationUnit } from "./CalculationUnit.js";
import fs from "fs";

export class VectorSystem {
  constructor(tree, mode) {
    this.mode = mode;
    this.treeNodes = this.treeToExecutionOrder(tree);
    this.constants = [];
    this.unprocessedTasks = [];

    this.treeNodes.forEach((node) => {
      if (node.left === null && node.right === null) {
        this.constants.push(node);
      } else {
        this.unprocessedTasks.push(node);
      }
    });

    this.dataBank = new DataBank(this.constants);
    this.calculationUnits =
      this.mode == "parallel"
        ? this.initializeCalculationUnits()
        : this.initializeSequentiveUnit();
  }

  initializeCalculationUnits() {
    const unitsConfig = [
      { name: "P[+] 1", operation: "+" },
      { name: "P[+] 2", operation: "+" },
      { name: "P[-] 1", operation: "-" },
      { name: "P[*] 1", operation: "*" },
      { name: "P[/] 1", operation: "/" },
    ];

    return unitsConfig.map(
      (config) =>
        new CalculationUnit(config.name, config.operation, this.dataBank)
    );
  }

  initializeSequentiveUnit() {
    const unitsConfig = [{ name: "P[_] 1", operation: "+" }];

    return unitsConfig.map(
      (config) =>
        new CalculationUnit(
          config.name,
          config.operation,
          this.dataBank,
          this.mode
        )
    );
  }

  processComputation() {
    while (this.unprocessedTasks.length || !this.isUnitsIdle()) {
      this.processClock();
    }
  }

  processClock() {
    if (this.unprocessedTasks.length) {
      this.assignTasks();
    }
    this.calculationUnits.forEach((unit) => unit.processClock());
    this.dataBank.processClock();
  }

  checkIfDependencyCalculated(task) {
    const leftExists =
      this.dataBank.constants.some(
        (constant) => constant.taskId == task.left
      ) || this.dataBank.data.some((data) => data.taskId == task.left);

    const rightExists =
      this.dataBank.constants.some(
        (constant) => constant.taskId == task.right
      ) || this.dataBank.data.some((data) => data.taskId == task.right);

    return leftExists && rightExists;
  }

  assignTasks() {
    const assignedTasks = [];

    this.unprocessedTasks.forEach((task) => {
      for (const unit of this.calculationUnits) {
        if (
          (this.mode == "sequentive" || unit.operation === task.value) &&
          unit.status === "idle" &&
          this.checkIfDependencyCalculated(task)
        ) {
          unit.setTask(task);
          assignedTasks.push(task);
          break;
        }
      }
    });

    assignedTasks.forEach((task) => {
      const taskIndex = this.unprocessedTasks.findIndex(
        (t) => t.id === task.id
      );
      if (taskIndex !== -1) {
        this.unprocessedTasks.splice(taskIndex, 1);
      }
    });
  }

  isUnitsIdle() {
    for (const unit of this.calculationUnits) {
      if (unit.status !== "idle") {
        return false;
      }
    }
    return true;
  }

  treeToExecutionOrder(tree) {
    const result = [];
    let currentId = 1;

    function traverse(node) {
      if (!node) return null;

      const leftId = traverse(node.left);
      const rightId = traverse(node.right);

      const nodeId = currentId++;

      result.push({
        id: nodeId,
        value: node.value,
        left: leftId,
        right: rightId,
      });

      return nodeId;
    }

    traverse(tree);

    return result;
  }

  getTime() {
    return this.dataBank.clock - 1;
  }

  calculateEffectiveness() {
    const totalIdleTime = this.calculationUnits.reduce((total, unit) => {
      return total + unit.logs.filter((log) => log.status === "idle").length;
    }, 0);

    const totalTime = this.getTime() * 5;

    const effectiveness =
      Math.round(((totalTime - totalIdleTime) / totalTime) * 100) / 100;

    return effectiveness;
  }

  getStats(sequentialTime) {
    const parallelTime = this.getTime();
    const acceleration =
      Math.round((sequentialTime / parallelTime) * 100) / 100;
    const effectiveness = this.calculateEffectiveness();

    return {
      parallelTime,
      sequentialTime,
      acceleration,
      effectiveness,
    };
  }

  writeDataToJson(
    expression,
    tree,
    sequentialTime,
    fileName = "./lab3/data.json"
  ) {
    const timeline = this.calculationUnits.map((unit) => {
      return {
        name: unit.name,
        tasks: unit.logs.map((log) => {
          const task = {
            clock: log.clock,
            taskId: log.taskId,
            status: log.status,
          };

          if (log.status === "reading") {
            task.readedTask = log.readedTask;
          }

          return task;
        }),
      };
    });

    const maxTime = Math.max(
      ...timeline.flatMap((unit) => unit.tasks.map((task) => task.clock))
    );

    const stats = this.getStats(sequentialTime);

    const dataForDiagram = {
      timeline,
      maxTime,
      stats,
      expression,
      tree,
    };

    fs.writeFileSync(
      fileName,
      JSON.stringify(dataForDiagram, null, 2),
      "utf-8"
    );

    console.log(`Обчислені дані записані у файл ${fileName}`);
  }
}
