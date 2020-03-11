exports.fetchQuestions = () => {
  const ret = [];
  for (let i = 0; i < 50; i++) {
    ret.push(genAddQuestion());
  }

  return ret;
};

const genAddQuestion = () => {
  const numOne = Math.floor(Math.random() * (50 - 1)) + 1;
  const numTwo = Math.floor(Math.random() * (50 - 1)) + 1;

  const soln = numOne + numTwo;

  const output = {
    q: `${numOne} + ${numTwo} = `,
    correctA: soln,
    incorrectAs: [
      soln + Math.floor(Math.random() * (5 - 1)) + 1,
      soln - Math.floor(Math.random() * (5 - 1)) - 1,
      Math.floor(Math.random() * (70 - 1)) + 1
    ]
  };
  return output;
};
