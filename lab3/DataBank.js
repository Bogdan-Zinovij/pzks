export class DataBank {
  constructor(constants) {
    this.status = "idle";
    this.constants = constants.map((constant) => ({
      taskId: constant.id,
      value: constant.value,
    }));
    this.data = [];
    this.operations = [];
    this.clock = 1;
  }

  checkIfAvailable() {
    const lastOperation = this.operations[this.operations.length - 1];
    return !lastOperation || lastOperation.clock !== this.clock;
  }

  write(taskId, value) {
    if (this.checkIfAvailable()) {
      this.data.push({ taskId, value });
      this.operations.push({ clock: this.clock, type: "W", taskId });
      return true;
    }

    return false;
  }

  read(taskIds, requestingTask) {
    if (this.checkIfAvailable()) {
      const foundItems = [];
      let dataItems = [];

      taskIds.forEach((taskId) => {
        // Спершу константи
        const constant = this.constants.find((el) => el.taskId === taskId);
        if (constant) {
          foundItems.push({ taskId, value: constant.value });
          return;
        }

        // Далі в data
        const dataItem = this.data.find((el) => el.taskId === taskId);
        if (dataItem) {
          dataItems.push({ taskId, value: dataItem.value });
        }
      });

      // Якщо обидва обчислені в інших блоках - повернути лише один за такт
      if (taskIds.length === 2 && dataItems.length === 2) {
        return [dataItems[0]];
      }

      this.operations.push({
        clock: this.clock,
        type: "R",
        taskId: requestingTask,
      });

      return [...foundItems, ...dataItems];
    }

    return [];
  }

  processClock() {
    this.clock++;
  }
}
