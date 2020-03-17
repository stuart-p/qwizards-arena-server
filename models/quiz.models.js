exports.fetchQuestions = () => {
  const allQuestions = [];
  for (let i = 0; i < 50; i++) {
    const question = genAddQuestion();
    console.log(question);
    const answers = [question.correctA, ...question.incorrectAs];

    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i);
      const temp = answers[i];
      answers[i] = answers[j];
      answers[j] = temp;
    }

    allQuestions.push(question);
  }
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
