// Helper utilities for quiz questions, option indexing, option text extraction, and ensuring 15 questions per quiz.

export function getOptionText(opt) {
  if (opt === null || opt === undefined) return '';
  if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
  if (typeof opt === 'object') {
    if (opt.value && typeof opt.value === 'string' && opt.value.trim() !== '') return opt.value;
    if (opt.text && typeof opt.text === 'string' && opt.text.trim() !== '') return opt.text;
    if (opt.content && typeof opt.content === 'string' && opt.content.trim() !== '') return opt.content;
    if (opt.title && typeof opt.title === 'string' && opt.title.trim() !== '') return opt.title;
    if (opt.option && typeof opt.option === 'string' && opt.option.trim() !== '') return opt.option;
    if (opt.label && typeof opt.label === 'string' && opt.label.length > 2) return opt.label;
  }
  return String(opt);
}

export function getCorrectOptionIndex(question) {
  if (!question) return 0;
  
  // 1. Check options array for is_correct / isCorrect flag
  if (question.options && Array.isArray(question.options)) {
    const correctIdx = question.options.findIndex(opt => opt && typeof opt === 'object' && (opt.is_correct === true || opt.isCorrect === true));
    if (correctIdx !== -1) return correctIdx;
  }
  
  // 2. Check question.answer numeric or string representation
  if (question.answer !== undefined && question.answer !== null) {
    const parsed = parseInt(question.answer, 10);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  
  return 0; // fallback to first option
}

// Generate topic-appropriate fallback questions to expand any quiz set to 15 questions
export function ensure15Questions(quiz) {
  if (!quiz) return null;

  let questions = Array.isArray(quiz.questions) ? [...quiz.questions] : [];
  const title = quiz.title || 'General Knowledge';
  const category = quiz.category || 'Technology';

  // Normalize existing questions
  questions = questions.map((q, idx) => {
    let rawOpts = q.options && q.options.length > 0 ? q.options : [
      { value: 'Option A', is_correct: true },
      { value: 'Option B', is_correct: false },
      { value: 'Option C', is_correct: false },
      { value: 'Option D', is_correct: false }
    ];
    
    const correctIdx = getCorrectOptionIndex(q);

    const opts = rawOpts.map((opt, i) => {
      let valStr = getOptionText(opt);
      if (!valStr || valStr === '[object Object]' || ['A', 'B', 'C', 'D'].includes(valStr.trim().toUpperCase())) {
        if (typeof opt === 'object') {
          valStr = opt.value || opt.text || opt.content || opt.title || opt.option || '';
        }
      }

      let isCorrect = i === correctIdx;
      if (opt && typeof opt === 'object' && (opt.is_correct === true || opt.isCorrect === true)) {
        isCorrect = true;
      }

      return {
        value: valStr || `Option ${String.fromCharCode(65 + i)}`,
        is_correct: isCorrect
      };
    });

    return {
      id: q.id || `q-${idx + 1}`,
      prompt: q.prompt || `${title}: Question ${idx + 1}`,
      options: opts,
      answer: getCorrectOptionIndex({ ...q, options: opts }),
      hint: q.hint || `Think carefully about core principles of ${category}.`,
      explanation: q.explanation || `This answer directly reflects key concepts in ${title}.`,
      points: q.points || 10
    };
  });

  // Generator seed templates for building themed questions up to 15 questions
  const generatorPool = [
    {
      prompt: `What is a primary pillar of ${title}?`,
      options: [
        { value: `Consistency and evidence-based methodology in ${category}`, is_correct: true },
        { value: `Random guess patterns without structural validation`, is_correct: false },
        { value: `Ignoring historical models and benchmarks`, is_correct: false },
        { value: `Sole reliance on temporary default values`, is_correct: false }
      ],
      hint: `Focus on consistency and evidence.`,
      explanation: `Consistency and verified principles are fundamental to understanding ${title}.`
    },
    {
      prompt: `In the context of ${category}, how is efficiency best measured?`,
      options: [
        { value: `By optimizing quality while reducing resource waste`, is_correct: true },
        { value: `By maximizing output regardless of errors`, is_correct: false },
        { value: `By skipping verification cycles entirely`, is_correct: false },
        { value: `By avoiding standard practices`, is_correct: false }
      ],
      hint: `Efficiency balances speed, quality, and resources.`,
      explanation: `Optimization ensures maximum outcome with minimal friction.`
    },
    {
      prompt: `Which approach is considered best practice when studying ${title}?`,
      options: [
        { value: `Iterative practice, feedback analysis, and recall`, is_correct: true },
        { value: `Passive reading without self-assessment`, is_correct: false },
        { value: `Memorizing answers without context`, is_correct: false },
        { value: `Avoiding challenging questions`, is_correct: false }
      ],
      hint: `Active learning is key.`,
      explanation: `Active recall and feedback lead to long-term mastery.`
    },
    {
      prompt: `What common misconception exists surrounding ${title}?`,
      options: [
        { value: `That mastery happens instantly without practice`, is_correct: true },
        { value: `That structured practice improves accuracy`, is_correct: false },
        { value: `That learning is enhanced through problem solving`, is_correct: false },
        { value: `That concepts evolve over time`, is_correct: false }
      ],
      hint: `Consider what people mistakenly assume about learning curve.`,
      explanation: `Mastery requires deliberate practice over time.`
    },
    {
      prompt: `How does innovation shape the evolution of ${category}?`,
      options: [
        { value: `By introducing refined techniques that solve modern challenges`, is_correct: true },
        { value: `By preserving legacy flaws without updating them`, is_correct: false },
        { value: `By restricting access to information`, is_correct: false },
        { value: `By eliminating user feedback`, is_correct: false }
      ],
      hint: `Think about solving modern problems.`,
      explanation: `Innovation builds upon foundational knowledge to solve modern problems.`
    },
    {
      prompt: `What role does critical thinking play in ${title}?`,
      options: [
        { value: `It enables evaluating options and choosing optimal solutions`, is_correct: true },
        { value: `It causes unnecessary delays without adding value`, is_correct: false },
        { value: `It forces reliance on intuition alone`, is_correct: false },
        { value: `It limits creativity`, is_correct: false }
      ],
      hint: `Evaluating options leads to optimal results.`,
      explanation: `Critical thinking enables sound evaluation and decision making.`
    },
    {
      prompt: `Which key factor determines long-term success in ${category}?`,
      options: [
        { value: `Continuous adaptation and disciplined practice`, is_correct: true },
        { value: `One-time effort without future review`, is_correct: false },
        { value: `Ignoring foundational theory`, is_correct: false },
        { value: `Working in complete isolation without peer input`, is_correct: false }
      ],
      hint: `Adaptability and discipline matter most.`,
      explanation: `Sustained progress comes from continuous improvement and practice.`
    },
    {
      prompt: `What distinguishes an expert from a beginner in ${title}?`,
      options: [
        { value: `Ability to analyze root causes and adapt to novel scenarios`, is_correct: true },
        { value: `Memorization of static definitions only`, is_correct: false },
        { value: `Speed over accuracy in execution`, is_correct: false },
        { value: `Avoiding complex challenges`, is_correct: false }
      ],
      hint: `Experts analyze root causes.`,
      explanation: `Expertise is marked by adaptability and deep comprehension.`
    },
    {
      prompt: `When analyzing results in ${title}, what metric is most valuable?`,
      options: [
        { value: `Overall accuracy and mastery progression`, is_correct: true },
        { value: `Number of attempts taken regardless of score`, is_correct: false },
        { value: `Time spent idling on questions`, is_correct: false },
        { value: `Visual formatting of the response`, is_correct: false }
      ],
      hint: `Accuracy and mastery indicate real learning.`,
      explanation: `Accuracy reflects effective comprehension and retention.`
    },
    {
      prompt: `Which methodology yields the highest retention when reviewing ${category}?`,
      options: [
        { value: `Spaced repetition and active self-testing`, is_correct: true },
        { value: `Cramming all material right before a deadline`, is_correct: false },
        { value: `Skimming text once without highlighting`, is_correct: false },
        { value: `Relying solely on audio lectures without practice`, is_correct: false }
      ],
      hint: `Spaced active testing boosts memory.`,
      explanation: `Spaced repetition reinforces neural connections for memory retention.`
    },
    {
      prompt: `What is the impact of feedback loops on learning ${title}?`,
      options: [
        { value: `They highlight knowledge gaps and correct errors rapidly`, is_correct: true },
        { value: `They create confusion and slow down progression`, is_correct: false },
        { value: `They prevent users from completing modules`, is_correct: false },
        { value: `They alter the core rules unpredictably`, is_correct: false }
      ],
      hint: `Feedback highlights gaps and corrects mistakes.`,
      explanation: `Immediate feedback reinforces correct knowledge and corrects errors.`
    },
    {
      prompt: `How should complex problems in ${category} be approached?`,
      options: [
        { value: `By breaking them down into smaller manageable components`, is_correct: true },
        { value: `By attempting to solve everything simultaneously`, is_correct: false },
        { value: `By avoiding complex tasks entirely`, is_correct: false },
        { value: `By guessing answers randomly`, is_correct: false }
      ],
      hint: `Decomposition makes big problems simple.`,
      explanation: `Decomposition reduces cognitive load and reveals actionable steps.`
    },
    {
      prompt: `Which strategy minimizes errors when solving problems in ${title}?`,
      options: [
        { value: `Double-checking assumptions and verifying edge cases`, is_correct: true },
        { value: `Rushing through without re-reading the prompt`, is_correct: false },
        { value: `Choosing the longest option by default`, is_correct: false },
        { value: `Assuming the first choice is always correct`, is_correct: false }
      ],
      hint: `Verification reduces errors.`,
      explanation: `Checking work and edge cases prevents careless errors.`
    },
    {
      prompt: `Why is foundational knowledge essential in ${category}?`,
      options: [
        { value: `It provides the framework needed for advanced reasoning`, is_correct: true },
        { value: `It is only useful for introductory exams`, is_correct: false },
        { value: `It replaces the need for practical application`, is_correct: false },
        { value: `It remains static and never applies to real world`, is_correct: false }
      ],
      hint: `Foundations enable advanced thinking.`,
      explanation: `Strong fundamentals support higher-level concepts and application.`
    },
    {
      prompt: `What is the final goal of mastering ${title}?`,
      options: [
        { value: `To apply principles confidently in real-world scenarios`, is_correct: true },
        { value: `To complete quizzes as quickly as possible`, is_correct: false },
        { value: `To store information without practical utility`, is_correct: false },
        { value: `To restrict knowledge sharing with others`, is_correct: false }
      ],
      hint: `Real-world confidence is the goal.`,
      explanation: `Mastery means confident, practical application of learned concepts.`
    }
  ];

  // Fill up to 15 questions if less than 15
  let poolIdx = 0;
  while (questions.length < 15) {
    const tmpl = generatorPool[poolIdx % generatorPool.length];
    poolIdx++;

    questions.push({
      id: `gen-q${questions.length + 1}`,
      prompt: tmpl.prompt,
      options: tmpl.options,
      answer: 0,
      hint: tmpl.hint,
      explanation: tmpl.explanation,
      points: 10
    });
  }

  return {
    ...quiz,
    questions: questions.slice(0, 15),
    estimated_minutes: 15
  };
}
