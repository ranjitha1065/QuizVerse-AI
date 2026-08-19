import { dailyQuestion } from '../data.js';

export function createQuizSession() {
  return { question: dailyQuestion, selected: null, answered: false };
}

export function gradeAnswer(session, selectedIndex) {
  return { ...session, selected: selectedIndex, answered: true, correct: selectedIndex === session.question.answer };
}
