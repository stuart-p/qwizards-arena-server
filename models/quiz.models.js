exports.fetchQuestions = () => {
  const allQuestions = [];
  const allAnswers = [];

  for (let i = 0; i < 50; i++) {
    const question = genAddQuestion();
    const answers = [question.correctA, ...question.incorrectAs];

    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i);
      const temp = answers[i];
      answers[i] = answers[j];
      answers[j] = temp;
    }

    allQuestions.push(question);
    allAnswers.push(answers);
  }

  return [allQuestions, allAnswers];
};

const genAddQuestion = () => {
  const numOne = Math.floor(Math.random() * (50 - 1)) + 1;
  const numTwo = Math.floor(Math.random() * (50 - 1)) + 1;

  const actualAnswer = numOne + numTwo;

  const output = {
    q: `${numOne} + ${numTwo} = `,
    correctA: actualAnswer,
    incorrectAs: [
      actualAnswer + Math.floor(Math.random() * (5 - 1)) + 1,
      actualAnswer - Math.floor(Math.random() * (5 - 1)) - 1,
      Math.floor(Math.random() * (70 - 1)) + 1
    ]
  };
  return output;
};
