import { supabase } from './supabase.js';
import { ensure15Questions } from '../utils/quiz.js';

// Pre-seeded local generative templates for high-quality instant mock AI quiz generation
const MOCK_TOPICS = {
  space: {
    title: "Cosmos & Deep Space",
    category: "Science",
    description: "An exploration of orbits, celestial bodies, and the history of stargazing.",
    icon: "orbit",
    color: "lavender",
    questions: [
      {
        prompt: "Which planet is known as the Red Planet due to iron oxide on its surface?",
        options: ["Mars", "Venus", "Jupiter", "Mercury"],
        answer: 0,
        hint: "It has two tiny moons named Phobos and Deimos.",
        explanation: "Mars appears red because of the iron oxide (rust) covering its surface."
      },
      {
        prompt: "What is the name of the first human-made satellite launched into space?",
        options: ["Explorer 1", "Sputnik 1", "Vanguard 1", "Apollo 11"],
        answer: 1,
        hint: "Launched by the Soviet Union in October 1957.",
        explanation: "Sputnik 1 was launched by the USSR on October 4, 1957, beginning the Space Age."
      },
      {
        prompt: "What boundary represents the limit where the gravity of a black hole is so strong nothing can escape?",
        options: ["Event Horizon", "Schwarzschild Limit", "Singularity Edge", "Accretion Boundary"],
        answer: 0,
        hint: "Once you pass this 'horizon', there is no going back.",
        explanation: "The Event Horizon is the threshold around a black hole where escape velocity exceeds the speed of light."
      }
    ]
  },
  javascript: {
    title: "Javascript Core & Async",
    category: "Technology",
    description: "Deep dive into closures, scopes, prototypes, and asynchronous promise chains.",
    icon: "braces",
    color: "mint",
    questions: [
      {
        prompt: "Which keyword is used to declare a block-scoped variable that can be reassigned?",
        options: ["var", "let", "const", "define"],
        answer: 1,
        hint: "Introduced in ES6 alongside const.",
        explanation: "'let' declares block-scoped local variables, allowing reassignment, unlike 'const'."
      },
      {
        prompt: "What is the primary mechanism Javascript uses to inherit properties from other objects?",
        options: ["Classical Inheritance", "Prototypal Inheritance", "Functional Copying", "Encapsulation Bundles"],
        answer: 1,
        hint: "Think about the hidden __proto__ property.",
        explanation: "Javascript uses prototypical inheritance, meaning objects can inherit properties directly from other prototype objects."
      },
      {
        prompt: "What state is a Promise in when it is created but not yet resolved or rejected?",
        options: ["fulfilled", "rejected", "pending", "settled"],
        answer: 2,
        hint: "It is waiting in limbo.",
        explanation: "A Promise is 'pending' when it is still executing and has not completed yet."
      }
    ]
  },
  history: {
    title: "Moments of the Renaissance",
    category: "History",
    description: "Art, architecture, politics, and science during the cultural rebirth of Europe.",
    icon: "landmark",
    color: "butter",
    questions: [
      {
        prompt: "Who painted the iconic ceiling of the Sistine Chapel in Rome?",
        options: ["Leonardo da Vinci", "Raphael", "Michelangelo", "Donatello"],
        answer: 2,
        hint: "He also sculpted the famous statue of David.",
        explanation: "Michelangelo painted the Sistine Chapel ceiling between 1508 and 1512 under commission of Pope Julius II."
      },
      {
        prompt: "In which Italian city did the Renaissance primarily begin in the 14th century?",
        options: ["Rome", "Venice", "Milan", "Florence"],
        answer: 3,
        hint: "Home of the Medici family and the Duomo.",
        explanation: "Florence is widely recognized as the birthplace of the Renaissance due to its wealthy patrons like the Medicis."
      }
    ]
  }
};

const DEFAULT_QUESTIONS = [
  {
    prompt: "What does AI stand for in computer science?",
    options: ["Artificial Intelligence", "Automated Integration", "Analytic Indexing", "Apex Iteration"],
    answer: 0,
    hint: "Think about machines mimicking smart behaviors.",
    explanation: "AI stands for Artificial Intelligence, which refers to the simulation of human intelligence in machines."
  },
  {
    prompt: "Which of the following is considered a core element of machine learning?",
    options: ["Hardcoded databases", "Linear instructions", "Training on datasets", "Manual screen readers"],
    answer: 2,
    hint: "Think about how a baby learns from examples.",
    explanation: "Machine learning relies on training mathematical models on datasets to recognize patterns without explicit instructions."
  }
];

export async function generateQuizFromAI(topic, difficulty = 'medium', count = 15) {
  const normalized = topic.toLowerCase().trim();
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiURL = import.meta.env.VITE_AI_API_URL;

  // 1. Direct Gemini Developer API Client-side Call (recommended if API key is provided)
  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const prompt = `Generate a high-quality learning quiz about the topic: "${topic}". Difficulty: ${difficulty}. Question count: ${count}. You must return a JSON object in exactly this format: { "title": "A short engaging title for the quiz", "description": "A brief summary of what is covered", "category": "One of: Design & Culture, Technology, Science, History, Pop culture, Business", "questions": [{ "prompt": "The question text", "options": ["Option A text", "Option B text", "Option C text", "Option D text"], "answer": 0, "hint": "A helpful clue", "explanation": "A complete description of why this is correct" }] }. The answer field must be the 0-based index of the correct option. Return ONLY valid raw JSON data matching this schema, no markdown blocks, no formatting.`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const contentText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(contentText.trim());
        if (parsed && parsed.questions && parsed.questions.length > 0) {
          return ensure15Questions({
            title: parsed.title || `AI Generated: ${topic}`,
            description: parsed.description || `Custom generated quiz about ${topic}.`,
            category: parsed.category || "Technology",
            difficulty: difficulty.toLowerCase(),
            questions: parsed.questions
          });
        }
      }
    } catch (e) {
      console.warn("Direct Gemini API quiz generation failed. Trying fallback.", e);
    }
  }

  // 2. Fallback to VITE_AI_API_URL
  if (apiURL) {
    try {
      const response = await fetch(`${apiURL}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, difficulty, count })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.questions && data.questions.length > 0) {
          return ensure15Questions({
            title: data.title || `AI Generated: ${topic}`,
            description: data.description || `Custom generated quiz about ${topic}.`,
            category: data.category || "Technology",
            difficulty: difficulty.toLowerCase(),
            questions: data.questions
          });
        }
      }
    } catch (e) {
      console.warn("AI Generation Endpoint failed. Falling back to local simulator.", e);
    }
  }

  // 3. Local simulator fallback
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate networking delay
  
  let match = Object.keys(MOCK_TOPICS).find(key => normalized.includes(key));
  let template = match ? MOCK_TOPICS[match] : null;

  if (template) {
    return ensure15Questions({
      title: `AI Generated: ${template.title}`,
      description: `A custom study set for "${topic}", simulated with GPT quality.`,
      category: template.category,
      difficulty: difficulty.toLowerCase(),
      questions: template.questions
    });
  }

  // General fallback template
  return ensure15Questions({
    title: `AI: Insight on ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
    description: `Automated quiz matching your topic prompt "${topic}".`,
    category: "Technology",
    difficulty: difficulty.toLowerCase(),
    questions: DEFAULT_QUESTIONS
  });
}

export async function generateStudyNotes(topic) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiURL = import.meta.env.VITE_AI_API_URL;

  // 1. Direct Gemini Developer API Call
  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const prompt = `Provide detailed study notes explaining the core concepts of "${topic}". Format your output in clean Markdown with clear headings and bullet points. Do not include markdown code block formatting wrap, just output the clean markdown text directly.`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const result = await response.json();
        const contentText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (contentText) return contentText;
      }
    } catch (e) {
      console.warn("Direct Gemini API notes generation failed. Trying fallback.", e);
    }
  }

  // 2. Fallback to API URL
  if (apiURL) {
    try {
      const response = await fetch(`${apiURL}/generate-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      if (response.ok) {
        const data = await response.json();
        return data.notes || `No notes returned from LLM.`;
      }
    } catch (e) {
      console.warn("AI Notes Endpoint failed.", e);
    }
  }

  // 3. Simulated notes fallback
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `### Study Notes: ${topic.toUpperCase()}

#### 1. Core Principles
- **Foundation Concepts**: Understanding the structural boundaries of "${topic}" is essential for practical application.
- **Critical Dynamics**: Pay attention to the interaction between elements and how errors cascade.

#### 2. Terminology Cheat Sheet
- **Primary Mechanism**: The underlying loop or execution framework that powers this topic.
- **Secondary Constraints**: Limits such as memory allocations, visual space, or processing cycles.

#### 3. Key Takeaway
Keep learning in public and test your assumptions using quizzes regularly to build strong mental associations!`;
}

export function generateAIFeedback(score, accuracy, level) {
  if (accuracy >= 90) {
    return `Incredible job! You showed deep understanding of this topic and made almost zero mistakes. You're ready to step up to a harder difficulty level or create a multiplayer room to challenge your peers.`;
  } else if (accuracy >= 70) {
    return `Great effort! You've got a solid grasp on these concepts, but look at the questions you missed to fill in the gaps. Retrying this quiz or reading the study notes will help lock in a perfect score.`;
  } else {
    return `Learning is a journey of mistakes! Review the detailed explanations for the options you got wrong, read our study notes, and try again. Each retry builds consistency.`;
  }
}

export function getPersonalizedRecommendations(profile, quizzes) {
  if (!quizzes || quizzes.length === 0) return [];
  const pref = profile?.favorite_category || '';
  
  // Sort quizzes by rating and plays, prioritizing their favorite category
  return [...quizzes].sort((a, b) => {
    const aFav = a.category_id === pref ? 1 : 0;
    const bFav = b.category_id === pref ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    return b.rating - a.rating;
  }).slice(0, 3);
}

// Selects next question based on current correctness history
export function adaptiveDifficulty(correctHistory, pool) {
  if (!pool || pool.length === 0) return null;
  
  // If the last answer was correct, filter for harder questions, if wrong, filter for easier
  const lastCorrect = correctHistory[correctHistory.length - 1];
  const targetDiff = lastCorrect ? 'hard' : 'easy';
  
  const matches = pool.filter(q => q.difficulty === targetDiff);
  if (matches.length > 0) {
    return matches[Math.floor(Math.random() * matches.length)];
  }
  
  // Fallback
  return pool[Math.floor(Math.random() * pool.length)];
}
