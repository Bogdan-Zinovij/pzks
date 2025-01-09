export class CalculationUnit {
  constructor(name, operation, dataBank, mode = "parallel") {
    this.mode = mode;
    this.name = name;
    this.operation = operation;
    this.dataBank = dataBank;

    this.durations = { "+": 2, "-": 3, "*": 4, "/": 8 };
    this.duration = this.durations[this.operation];
    this.data = [];
    this.dataForCalculation = [];
    this.logs = [];
    this.task = null;
    this.remainProcesTime = 0;
    this.clock = 1;
    this.status = "idle";
  }

  setTask(task) {
    this.task = task;
    if (this.mode == "parallel") {
      this.remainProcesTime = this.duration;
    } else {
      this.operation = task.value;
      this.duration = this.durations[this.operation];
      this.remainProcesTime = this.duration;
    }
    this.status = "reading";
  }

  processClock() {
    if (!this.task) {
      this.logs.push({
        clock: this.clock,
        taskId: null,
        status: "idle",
      });
      this.clock++;
      return;
    }

    switch (this.status) {
      case "reading":
        this.readData();
        break;

      case "processing":
        this.processTask();
        break;

      case "writing":
        this.writeResult();
        break;
    }

    this.clock++;
  }

  readData() {
    const task = this.task;

    if (this.dataForCalculation.length < 2) {
      const neededIds = [task.left, task.right];

      // Пошук локально
      for (const neededId of neededIds) {
        if (
          !this.dataForCalculation.some((entry) => entry.taskId === neededId)
        ) {
          const localData = this.data.find(
            (entry) => entry.taskId === neededId
          );

          if (localData) {
            this.dataForCalculation.push(localData);

            if (this.dataForCalculation.length === 2) {
              this.status = "processing";
              this.processTask();
              return;
            }
          }
        }
      }

      // Пошук з dataBank
      const missingIds = neededIds.filter(
        (id) => !this.dataForCalculation.some((entry) => entry.taskId === id)
      );

      if (missingIds.length > 0) {
        const result = this.dataBank.read(missingIds, this.task.id);
        if (result.length) {
          let readedTask;
          this.dataForCalculation.push({
            taskId: missingIds[0],
            value: result[0],
          });
          readedTask = missingIds[0];
          if (result.length == 2) {
            this.dataForCalculation.push({
              taskId: missingIds[1],
              value: result[1],
            });
            readedTask = task.id;
          }
          this.logs.push({
            clock: this.clock,
            taskId: task.id,
            status: "reading",
            readedTask,
          });
        } else {
          this.logs.push({
            clock: this.clock,
            taskId: task.id,
            status: "idle",
          });
          return;
        }
      }

      if (this.dataForCalculation.length === 2) {
        this.status = "processing";
      }
    }
  }

  processTask() {
    this.remainProcesTime--;

    this.logs.push({
      clock: this.clock,
      taskId: this.task.id,
      status: "processing",
    });

    if (this.remainProcesTime === 0) {
      this.status = "writing";
    }
  }

  writeResult() {
    const result = "123";

    const success = this.dataBank.write(this.task.id, result);
    this.data.push({ taskId: this.task.id, value: result });

    if (success) {
      this.logs.push({
        clock: this.clock,
        taskId: this.task.id,
        status: "writing",
      });

      this.resetUnit();
    } else {
      this.logs.push({
        clock: this.clock,
        taskId: this.task.id,
        status: "idle",
      });
    }
  }

  resetUnit() {
    this.task = null;
    this.dataForCalculation = [];
    this.status = "idle";
    this.remainProcesTime = 0;
  }
}
