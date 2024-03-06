const ProgressBar = require('progress');

const createProgressBar = (total) => {
  const bar = new ProgressBar(':percent', { total });
  const timer = setInterval(() => {
    bar.tick();
    if (bar.complete) {
      clearInterval(timer);
    }
  }, 1);

  return {
    bar,
    timer,
  };
};

const updateProgressBar = (bar, progress) => {
  bar.tick(progress);
};

const stopProgressBar = (bar, timer) => {
  clearInterval(timer);
  bar.terminate();
};

module.exports = {
  createProgressBar,
  updateProgressBar,
  stopProgressBar,
};
