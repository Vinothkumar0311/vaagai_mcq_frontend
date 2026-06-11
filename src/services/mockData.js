// Mock Database for development
const mockTestsKey = 'mcq_mock_tests';
const mockResultsKey = 'mcq_mock_results';
const mockUsersKey = 'mcq_mock_users';

// Initial Seed Data
const initialTests = [
  {
    id: 'TST-1001',
    name: 'Advanced React & Redux Architecture',
    date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    duration: 45, // mins
    status: 'PUBLISHED',
    questionsCount: 5,
    examineeEmails: ['examiner@vaagai.com', 'vinoth@example.com']
  },
  {
    id: 'TST-1002',
    name: 'Database Systems & SQL Optimization',
    date: new Date(Date.now() + 86400000 * 5).toISOString(),
    duration: 30,
    status: 'PUBLISHED',
    questionsCount: 4,
    examineeEmails: ['examiner@vaagai.com', 'vinoth@example.com']
  },
  {
    id: 'TST-1003',
    name: 'Node.js Performance Tuning (Draft)',
    date: new Date(Date.now() + 86400000 * 10).toISOString(),
    duration: 60,
    status: 'DRAFT',
    questionsCount: 0,
    examineeEmails: []
  }
];

const initialQuestions = {
  'TST-1001': [
    {
      id: 1,
      question: 'Which Hook should be used to avoid unnecessary re-renders of a child component when passing a callback function?',
      optionA: 'useMemo',
      optionB: 'useCallback',
      optionC: 'useEffect',
      optionD: 'useRef',
      correctAnswer: 'B'
    },
    {
      id: 2,
      question: 'What is the primary purpose of Redux Middleware?',
      optionA: 'To render UI elements directly',
      optionB: 'To provide a side-effect pipeline between dispatching an action and the moment it reaches the reducer',
      optionC: 'To manage local component state',
      optionD: 'To optimize DOM reconciliation',
      correctAnswer: 'B'
    },
    {
      id: 3,
      question: 'In React 19, what does the useActionState hook do?',
      optionA: 'It replaces the standard useState hook for form submissions and pending status indicators',
      optionB: 'It handles high frequency mouse events',
      optionC: 'It creates a database index',
      optionD: 'It connects React directly to a database without a backend server',
      correctAnswer: 'A'
    },
    {
      id: 4,
      question: 'Which of the following is true about Virtual DOM?',
      optionA: 'It makes the browser render directly to canvas',
      optionB: 'It is a lightweight JavaScript representation of the real DOM used for performance optimizations',
      optionC: 'It disables JavaScript engines in modern browsers',
      optionD: 'It requires a specialized browser plugin to run',
      correctAnswer: 'B'
    },
    {
      id: 5,
      question: 'What does the React compiler (React Forget) aim to solve?',
      optionA: 'Translating React components into C++',
      optionB: 'Automating the memoization process (useMemo, useCallback) to simplify developers code while keeping it highly performant',
      optionC: 'Compiling React into native mobile assembly code',
      optionD: 'Automatically deleting unused variables in CSS files',
      correctAnswer: 'B'
    }
  ],
  'TST-1002': [
    {
      id: 6,
      question: 'Which normal form deals with removing partial dependencies in database tables?',
      optionA: 'First Normal Form (1NF)',
      optionB: 'Second Normal Form (2NF)',
      optionC: 'Third Normal Form (3NF)',
      optionD: 'Boyce-Codd Normal Form (BCNF)',
      correctAnswer: 'B'
    },
    {
      id: 7,
      question: 'Which index type is best suited for high-cardinality columns where query conditions search for equality ranges?',
      optionA: 'Hash Index',
      optionB: 'B-Tree Index',
      optionC: 'Bitmap Index',
      optionD: 'Spatial Index',
      correctAnswer: 'B'
    },
    {
      id: 8,
      question: 'What does ACID stand for in DBMS?',
      optionA: 'Action, Consistency, Integrity, Durability',
      optionB: 'Atomicity, Consistency, Isolation, Durability',
      optionC: 'Aggregation, Complexity, Indexing, Distribution',
      optionD: 'Anomaly, Concurrency, Isolation, Deletion',
      correctAnswer: 'B'
    },
    {
      id: 9,
      question: 'What is a cross join in SQL?',
      optionA: 'An inner join with an equality condition',
      optionB: 'A Cartesian product of two tables returning every combination of rows',
      optionC: 'A join that links tables from different databases',
      optionD: 'A select statement that utilizes multiple WHERE conditions',
      correctAnswer: 'B'
    }
  ]
};

const initialResults = [
  {
    id: 1,
    testId: 'TST-1001',
    testName: 'Advanced React & Redux Architecture',
    userId: 2,
    userName: 'Jane Doe',
    userEmail: 'examiner@vaagai.com',
    score: 4,
    total: 5,
    timeTaken: 184,
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 2,
    testId: 'TST-1002',
    testName: 'Database Systems & SQL Optimization',
    userId: 2,
    userName: 'Jane Doe',
    userEmail: 'examiner@vaagai.com',
    score: 3,
    total: 4,
    timeTaken: 120,
    submittedAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

// Helper to initialize local storage
const initLocalStorage = () => {
  if (!localStorage.getItem(mockTestsKey)) {
    localStorage.setItem(mockTestsKey, JSON.stringify(initialTests));
  }
  if (!localStorage.getItem('mcq_mock_questions')) {
    localStorage.setItem('mcq_mock_questions', JSON.stringify(initialQuestions));
  }
  if (!localStorage.getItem(mockResultsKey)) {
    localStorage.setItem(mockResultsKey, JSON.stringify(initialResults));
  }
  if (!localStorage.getItem(mockUsersKey)) {
    localStorage.setItem(mockUsersKey, JSON.stringify([
      { id: 1, email: 'admin@vaagai.com', name: 'Vaagai Admin', role: 'ADMIN', avatar: '' },
      { id: 2, email: 'examiner@vaagai.com', name: 'Jane Doe', role: 'EXAMINER', avatar: '' }
    ]));
  }
};

initLocalStorage();

// Get mock database utilities
export const getMockData = (key) => {
  initLocalStorage();
  return JSON.parse(localStorage.getItem(key));
};

export const setMockData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Simulate network latency delay
const delay = (ms = 600) => new Promise(resolve => setTimeout(resolve, ms));

export const mockAuthApi = {
  login: async (email, name = 'Jane Doe', avatar = '') => {
    await delay();
    const users = getMockData(mockUsersKey);
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Create user
      const isFirst = users.length === 0 || email.toLowerCase() === 'admin@vaagai.com';
      user = {
        id: users.length + 1,
        email: email.toLowerCase(),
        name: name,
        role: isFirst ? 'ADMIN' : 'EXAMINER',
        avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
      };
      users.push(user);
      setMockData(mockUsersKey, users);
    }
    
    const token = `mock-jwt-token-for-${user.email}`;
    return { token, user };
  }
};

export const mockAdminApi = {
  getStats: async () => {
    await delay();
    const tests = getMockData(mockTestsKey);
    const results = getMockData(mockResultsKey);
    const users = getMockData(mockUsersKey);

    const totalUsers = users.filter(u => u.role === 'EXAMINER').length;
    const totalTests = tests.length;
    const totalResults = results.length;

    return {
      totalUsers,
      totalTests,
      totalResults,
      recentResults: results.slice(0, 5)
    };
  },

  getTests: async () => {
    await delay();
    return getMockData(mockTestsKey);
  },

  createTest: async (testData) => {
    await delay();
    const tests = getMockData(mockTestsKey);
    const newTestId = `TST-${1000 + tests.length + 1}`;
    
    const newTest = {
      id: newTestId,
      name: testData.name,
      date: new Date(testData.date).toISOString(),
      duration: parseInt(testData.duration, 10),
      status: 'DRAFT',
      questionsCount: 0,
      examineeEmails: testData.examineeEmails || []
    };

    tests.unshift(newTest);
    setMockData(mockTestsKey, tests);
    return newTest;
  },

  updateTest: async (id, updatedData) => {
    await delay();
    const tests = getMockData(mockTestsKey);
    const index = tests.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Test not found');

    tests[index] = { ...tests[index], ...updatedData };
    setMockData(mockTestsKey, tests);
    return tests[index];
  },

  deleteTest: async (id) => {
    await delay();
    const tests = getMockData(mockTestsKey);
    const filtered = tests.filter(t => t.id !== id);
    setMockData(mockTestsKey, filtered);

    // Also remove associated questions
    const questions = getMockData('mcq_mock_questions');
    delete questions[id];
    setMockData('mcq_mock_questions', questions);

    return { success: true };
  },

  uploadQuestions: async (testId, questionsList) => {
    await delay(1200); // Excel uploading takes a bit longer
    const questions = getMockData('mcq_mock_questions');
    questions[testId] = questionsList.map((q, index) => ({
      id: index + 1,
      ...q
    }));
    setMockData('mcq_mock_questions', questions);

    // Update count in tests
    const tests = getMockData(mockTestsKey);
    const index = tests.findIndex(t => t.id === testId);
    if (index !== -1) {
      tests[index].questionsCount = questionsList.length;
      setMockData(mockTestsKey, tests);
    }

    return { success: true, count: questionsList.length };
  },

  getQuestions: async (testId) => {
    await delay();
    const questions = getMockData('mcq_mock_questions');
    return questions[testId] || [];
  },

  getResults: async (search = '', testId = '', page = 1, limit = 10) => {
    await delay();
    let results = getMockData(mockResultsKey);

    if (testId) {
      results = results.filter(r => r.testId === testId);
    }

    if (search) {
      results = results.filter(r => 
        r.userName.toLowerCase().includes(search.toLowerCase()) || 
        r.userEmail.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = results.length;
    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);

    return {
      results: paginatedResults,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};

export const mockExaminerApi = {
  getTests: async (email) => {
    await delay();
    const tests = getMockData(mockTestsKey).filter(t => t.status === 'PUBLISHED');
    const results = getMockData(mockResultsKey);
    const user = getMockData(mockUsersKey).find(u => u.email.toLowerCase() === email.toLowerCase());
    const userId = user ? user.id : 0;

    return tests.map(t => {
      // Check if this test is assigned to the examiner's email
      const isAssigned = t.examineeEmails.some(e => e.toLowerCase() === email.toLowerCase());
      if (!isAssigned) return null;

      const result = results.find(r => r.testId === t.id && r.userId === userId);
      return {
        id: t.id,
        name: t.name,
        date: t.date,
        duration: t.duration,
        questionCount: t.questionsCount,
        hasAttempted: !!result,
        score: result ? result.score : null,
        total: result ? result.total : null,
        submittedAt: result ? result.submittedAt : null
      };
    }).filter(Boolean);
  },

  getTestQuestions: async (testId, email) => {
    await delay();
    const tests = getMockData(mockTestsKey);
    const test = tests.find(t => t.id === testId);
    if (!test || test.status !== 'PUBLISHED') throw new Error('Test not found or not published');

    const user = getMockData(mockUsersKey).find(u => u.email.toLowerCase() === email.toLowerCase());
    const userId = user ? user.id : 0;

    // Check attempt
    const results = getMockData(mockResultsKey);
    const existing = results.find(r => r.testId === testId && r.userId === userId);
    if (existing) throw new Error('You have already attempted this test.');

    const questions = getMockData('mcq_mock_questions')[testId] || [];

    // Shuffle questions order
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

    return {
      id: test.id,
      name: test.name,
      duration: test.duration,
      questions: shuffledQuestions.map(q => ({
        id: q.id,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        imageUrl: q.imageUrl || null
      }))
    };
  },

  submitTest: async (testId, answers, timeTaken, email) => {
    await delay(1000);
    const tests = getMockData(mockTestsKey);
    const test = tests.find(t => t.id === testId);
    if (!test) throw new Error('Test not found');

    const users = getMockData(mockUsersKey);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('User not found');

    const questions = getMockData('mcq_mock_questions')[testId] || [];
    const results = getMockData(mockResultsKey);

    // Double check attempt
    const existing = results.find(r => r.testId === testId && r.userId === user.id);
    if (existing) throw new Error('Already submitted.');

    // Calculate score
    let score = 0;
    questions.forEach(q => {
      const selected = answers.find(a => a.questionId === q.id)?.selectedOption;
      if (selected && selected.toUpperCase() === q.correctAnswer.toUpperCase()) {
        score++;
      }
    });

    const newResult = {
      id: results.length + 1,
      testId,
      testName: test.name,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      score,
      total: questions.length,
      timeTaken,
      submittedAt: new Date().toISOString()
    };

    results.unshift(newResult);
    setMockData(mockResultsKey, results);

    return {
      score,
      total: questions.length,
      resultId: newResult.id
    };
  },

  getResultDetails: async (resultId, email) => {
    await delay();
    const results = getMockData(mockResultsKey);
    const result = results.find(r => r.id === parseInt(resultId, 10));
    if (!result) throw new Error('Result not found');

    const questions = getMockData('mcq_mock_questions')[result.testId] || [];

    return {
      ...result,
      questions: questions.map(q => ({
        id: q.id,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        imageUrl: q.imageUrl || null
      }))
    };
  }
};
