const fetchQuestions = () => {
  const ret = [];
};

const genAddQuestion = () => {
  const numOne = Math.floor(Math.random() * (50 - 1)) + 1;
  const numTwo = Math.floor(Math.random() * (50 - 1)) + 1;

  const soln = numOne + numTwo;

  const output = {
    question: `${numOne} + ${numTwo} = `,
    answer: soln,
    incorrectAnswers: [
      soln + Math.floor(Math.random() * (5 - 1)) + 1,
      soln - Math.floor(Math.random() * (5 - 1)) - 1,
      Math.floor(Math.random() * (70 - 1)) + 1
    ]
  };
  return output;
};
