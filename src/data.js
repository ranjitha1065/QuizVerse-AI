export const categories = [
  { name: 'Design & Culture', count: '240 quizzes', color: 'peach', icon: 'palette', description: 'Visual thinking, art history, and the ideas shaping culture.' },
  { name: 'Technology', count: '384 quizzes', color: 'mint', icon: 'cpu', description: 'The tools, people, and concepts changing how we build.' },
  { name: 'Science', count: '192 quizzes', color: 'lavender', icon: 'atom', description: 'Big questions about our world, explained beautifully.' },
  { name: 'History', count: '318 quizzes', color: 'butter', icon: 'landmark', description: 'Moments, movements, and people worth remembering.' },
  { name: 'Pop culture', count: '276 quizzes', color: 'sky', icon: 'sparkles', description: 'Films, music, internet lore, and the details you missed.' },
  { name: 'Business', count: '156 quizzes', color: 'rose', icon: 'trending-up', description: 'Ideas, markets, and the craft behind ambitious companies.' }
];

export const featuredQuizzes = [
  { id: 'design-quiet', category: 'Design & Culture', title: 'The quiet power of good design', description: 'A visual tour through the choices you feel before you see.', questions: 15, time: '15 min', difficulty: 'Easy', color: 'peach', icon: 'pen-tool', progress: 0 },
  { id: 'creative-code', category: 'Technology', title: 'Creative coding, decoded', description: 'From generative art to playful interfaces: how computers get expressive.', questions: 15, time: '15 min', difficulty: 'Medium', color: 'mint', icon: 'braces', progress: 42 },
  { id: 'tiny-universe', category: 'Science', title: 'A tiny universe inside your phone', description: 'The elegant physics behind the technology in your pocket.', questions: 15, time: '15 min', difficulty: 'Medium', color: 'lavender', icon: 'orbit', progress: 0 }
];

export const dailyQuestion = {
  category: 'Creative coding',
  prompt: 'What does “generative design” primarily describe?',
  hint: 'Think about systems that help create outcomes rather than one fixed output.',
  options: [
    'A system that creates many possible design outcomes',
    'A way to make every interface move automatically',
    'A method for compressing large design files',
    'A tool used only for 3D printing'
  ],
  answer: 0
};

export const stats = [
  { label: 'Quizzes completed', value: '24', meta: '+6 this month', icon: 'check-circle-2', color: 'peach' },
  { label: 'Current streak', value: '12 days', meta: 'Personal best: 18', icon: 'flame', color: 'butter' },
  { label: 'Average accuracy', value: '86%', meta: '+8% since April', icon: 'target', color: 'mint' }
];

export const heatmap = Array.from({ length: 91 }, (_, index) => {
  const values = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4];
  return values[(index * 7 + 3) % values.length];
});
