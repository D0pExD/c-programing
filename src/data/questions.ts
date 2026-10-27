export type QuestionType = 'mcq' | 'output' | 'code_fix';

export interface QuestionOption {
  label: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export interface Question {
  id: number;
  type: QuestionType;
  title: string;
  description?: string;
  code?: string;
  options?: QuestionOption[]; // for mcq
  correctAnswer: string; // For MCQ: 'A', 'B', 'C', 'D'. For output/code_fix: expected output or fix
  explanation: string;
  timeLimitSeconds: number; // default 20s
}

export const QUESTIONS: Question[] = [
  // ======================= UNIT 1: FUNDAMENTALS (1-10) =======================

  // 1. EASY (looks tricky) - Output
  {
    id: 1,
    type: 'output',
    title: 'Integer Division Surprise',
    description: 'What exact number does this program print?',
    code: `#include <stdio.h>

int main() {
    printf("%d", 7 / 2 + 7 % 2);
    return 0;
}`,
    correctAnswer: '4',
    explanation: 'Both operands are integers, so 7 / 2 is 3 (the decimal part is dropped). 7 % 2 is the remainder 1. So 3 + 1 = 4.',
    timeLimitSeconds: 15,
  },

  // 2. EASY (confusing) - MCQ
  {
    id: 2,
    type: 'mcq',
    title: 'Who Goes First?',
    description: 'What value is stored in r?',
    code: `#include <stdio.h>

int main() {
    int r = 2 + 3 * 4 - 6 / 2;
    printf("%d", r);
    return 0;
}`,
    options: [
      { label: 'A', text: '7' },
      { label: 'B', text: '11' },
      { label: 'C', text: '12' },
      { label: 'D', text: '14' },
    ],
    correctAnswer: 'B',
    explanation: '* and / have higher precedence than + and -. So 3 * 4 = 12 and 6 / 2 = 3. Then 2 + 12 - 3 = 11. (7 is what you get if you wrongly go strictly left to right.)',
    timeLimitSeconds: 20,
  },

  // 3. EASY - Output
  {
    id: 3,
    type: 'output',
    title: 'Pre vs Post Increment',
    description: 'Type the exact output (with single spaces between the numbers).',
    code: `#include <stdio.h>

int main() {
    int x = 5;
    int y = x++;
    int z = ++x;
    printf("%d %d %d", x, y, z);
    return 0;
}`,
    correctAnswer: '7 5 7',
    explanation: 'y = x++ stores the old value 5 in y, then x becomes 6. z = ++x makes x 7 first, then stores 7 in z. So x = 7, y = 5, z = 7.',
    timeLimitSeconds: 20,
  },

  // 4. TOUGH - MCQ
  {
    id: 4,
    type: 'mcq',
    title: 'The Size of a Single Quote',
    description: 'In C, on a typical machine where int is 4 bytes, what does this print?',
    code: `#include <stdio.h>

int main() {
    printf("%zu", sizeof('A'));
    return 0;
}`,
    options: [
      { label: 'A', text: '1' },
      { label: 'B', text: '2' },
      { label: 'C', text: '4' },
      { label: 'D', text: '8' },
    ],
    correctAnswer: 'C',
    explanation: 'In C (not C++), a character constant like \'A\' has type int, not char. So sizeof(\'A\') equals sizeof(int), which is 4 here. sizeof(char) would be 1.',
    timeLimitSeconds: 25,
  },

  // 5. EASY - Output
  {
    id: 5,
    type: 'output',
    title: 'Bitwise Trio',
    description: 'What is printed? (single spaces between the numbers)',
    code: `#include <stdio.h>

int main() {
    int a = 12, b = 10;   // 1100 and 1010
    printf("%d %d %d", a & b, a | b, a ^ b);
    return 0;
}`,
    correctAnswer: '8 14 6',
    explanation: '1100 & 1010 = 1000 (8). 1100 | 1010 = 1110 (14). 1100 ^ 1010 = 0110 (6).',
    timeLimitSeconds: 25,
  },

  // 6. EASY - MCQ
  {
    id: 6,
    type: 'mcq',
    title: 'Valid Identifier',
    description: 'Which of these is a valid variable name in C?',
    options: [
      { label: 'A', text: '2total' },
      { label: 'B', text: 'total-2' },
      { label: 'C', text: '_total2' },
      { label: 'D', text: 'float' },
    ],
    correctAnswer: 'C',
    explanation: 'Identifiers may use letters, digits and underscore, and cannot start with a digit. 2total starts with a digit, total-2 has a hyphen, and float is a keyword. _total2 is valid.',
    timeLimitSeconds: 15,
  },

  // 7. EASY (confusing) - Output
  {
    id: 7,
    type: 'output',
    title: 'True Plus False',
    description: 'What number is printed?',
    code: `#include <stdio.h>

int main() {
    int a = 5, b = 10;
    printf("%d", (a < b) + (a == b) + (a != b));
    return 0;
}`,
    correctAnswer: '2',
    explanation: 'Relational expressions give 1 for true and 0 for false. (5 < 10) = 1, (5 == 10) = 0, (5 != 10) = 1. Sum = 2.',
    timeLimitSeconds: 20,
  },

  // 8. TOUGH - MCQ
  {
    id: 8,
    type: 'mcq',
    title: 'Chained Comparison Trap',
    description: 'What does this program print?',
    code: `#include <stdio.h>

int main() {
    printf("%d", 5 > 3 > 1);
    return 0;
}`,
    options: [
      { label: 'A', text: '1' },
      { label: 'B', text: '0' },
      { label: 'C', text: '3' },
      { label: 'D', text: 'Compile error' },
    ],
    correctAnswer: 'B',
    explanation: 'C does not chain comparisons like maths. It evaluates left to right: (5 > 3) is 1, then (1 > 1) is false, which is 0.',
    timeLimitSeconds: 25,
  },

  // 9. EASY - MCQ
  {
    id: 9,
    type: 'mcq',
    title: 'Rounding Up with math.h',
    description: 'Which function from math.h returns the smallest integer value that is not less than x (so ceil-ing 4.2 gives 5)?',
    options: [
      { label: 'A', text: 'floor()' },
      { label: 'B', text: 'ceil()' },
      { label: 'C', text: 'pow()' },
      { label: 'D', text: 'fabs()' },
    ],
    correctAnswer: 'B',
    explanation: 'ceil(x) rounds up to the next whole number (ceil(4.2) = 5). floor() rounds down, pow() raises to a power, and fabs() gives the absolute value.',
    timeLimitSeconds: 15,
  },

  // 10. MEDIUM - Output
  {
    id: 10,
    type: 'output',
    title: 'Operator Soup',
    description: 'What integer is printed?',
    code: `#include <stdio.h>

int main() {
    printf("%d", 10 - 4 - 2 * 3 + 20 % 6 / 4);
    return 0;
}`,
    correctAnswer: '0',
    explanation: 'Step by step: 2 * 3 = 6. 20 % 6 = 2, then 2 / 4 = 0 (integer division). Now 10 - 4 = 6, then 6 - 6 = 0, then 0 + 0 = 0.',
    timeLimitSeconds: 30,
  },

  // ======================= UNIT 2: CONTROL STRUCTURES AND LOOPS (11-20) =======================

  // 11. EASY (confusing) - Output
  {
    id: 11,
    type: 'output',
    title: 'Two Ifs and One Else',
    description: 'What is printed? (Only letters, no spaces.)',
    code: `#include <stdio.h>

int main() {
    int n = 15;
    if (n % 3 == 0) printf("A");
    if (n % 5 == 0) printf("B");
    else printf("C");
    return 0;
}`,
    correctAnswer: 'AB',
    explanation: 'These are two separate if statements. The first is true, so A prints. The second is also true, so B prints and its else (C) is skipped. Output: AB.',
    timeLimitSeconds: 20,
  },

  // 12. EASY (confusing) - MCQ
  {
    id: 12,
    type: 'mcq',
    title: 'One Equals Sign Too Few',
    description: 'What does this program print?',
    code: `#include <stdio.h>

int main() {
    int a = 5;
    if (a = 0)
        printf("Zero");
    else
        printf("NonZero");
    return 0;
}`,
    options: [
      { label: 'A', text: 'Zero' },
      { label: 'B', text: 'NonZero' },
      { label: 'C', text: 'Compile error' },
      { label: 'D', text: 'Nothing is printed' },
    ],
    correctAnswer: 'B',
    explanation: '(a = 0) is an assignment, not a comparison. It stores 0 in a, and the value of the expression is 0, which is false. So the else branch runs and prints NonZero.',
    timeLimitSeconds: 20,
  },

  // 13. EASY - Output
  {
    id: 13,
    type: 'output',
    title: 'Switch Falls Through',
    description: 'What is printed? (Only letters, no spaces.)',
    code: `#include <stdio.h>

int main() {
    int x = 3;
    switch (x) {
        case 1: printf("O"); break;
        case 3: printf("T");
        case 4: printf("F"); break;
        default: printf("D");
    }
    return 0;
}`,
    correctAnswer: 'TF',
    explanation: 'x is 3, so execution starts at case 3 and prints T. There is no break there, so it falls into case 4 and prints F, where the break stops it.',
    timeLimitSeconds: 20,
  },

  // 14. TOUGH - MCQ
  {
    id: 14,
    type: 'mcq',
    title: 'Nested Ternary',
    description: 'What is printed?',
    code: `#include <stdio.h>

int main() {
    int a = 4, b = 9;
    printf("%d", a > b ? a : b > 5 ? 100 : 200);
    return 0;
}`,
    options: [
      { label: 'A', text: '4' },
      { label: 'B', text: '9' },
      { label: 'C', text: '100' },
      { label: 'D', text: '200' },
    ],
    correctAnswer: 'C',
    explanation: 'The ?: operator groups right to left, so this is a > b ? a : (b > 5 ? 100 : 200). 4 > 9 is false, so the second part runs: 9 > 5 is true, giving 100.',
    timeLimitSeconds: 30,
  },

  // 15. EASY - Output
  {
    id: 15,
    type: 'output',
    title: 'Sum with a For Loop',
    description: 'What number is printed?',
    code: `#include <stdio.h>

int main() {
    int s = 0;
    for (int i = 1; i <= 5; i++)
        s += i;
    printf("%d", s);
    return 0;
}`,
    correctAnswer: '15',
    explanation: '1 + 2 + 3 + 4 + 5 = 15.',
    timeLimitSeconds: 15,
  },

  // 16. TOUGH - Output
  {
    id: 16,
    type: 'output',
    title: 'Continue Meets Break',
    description: 'What is printed? (Digits only, no spaces.)',
    code: `#include <stdio.h>

int main() {
    for (int i = 1; i <= 10; i++) {
        if (i % 2 == 0) continue;
        if (i > 7) break;
        printf("%d", i);
    }
    return 0;
}`,
    correctAnswer: '1357',
    explanation: 'Even numbers are skipped by continue. Odd numbers 1, 3, 5 and 7 print (7 is not greater than 7). At i = 9 the loop hits break and stops. Output: 1357.',
    timeLimitSeconds: 30,
  },

  // 17. EASY - MCQ
  {
    id: 17,
    type: 'mcq',
    title: 'Do-While Runs at Least Once',
    description: 'What is printed by this program?',
    code: `#include <stdio.h>

int main() {
    int i = 10;
    do {
        printf("X");
        i++;
    } while (i < 5);
    return 0;
}`,
    options: [
      { label: 'A', text: 'Nothing' },
      { label: 'B', text: 'X' },
      { label: 'C', text: 'XXXXX' },
      { label: 'D', text: 'It loops forever' },
    ],
    correctAnswer: 'B',
    explanation: 'A do-while is a post-test loop. The body runs once first and prints X. Then i is 11, so (11 < 5) is false and the loop ends.',
    timeLimitSeconds: 15,
  },

  // 18. TOUGH - Output
  {
    id: 18,
    type: 'output',
    title: 'Break Only Breaks the Inner Loop',
    description: 'What is the final value of c that gets printed?',
    code: `#include <stdio.h>

int main() {
    int c = 0;
    for (int i = 0; i < 4; i++) {
        for (int j = 0; j < 4; j++) {
            if (j == 2) break;
            c++;
        }
    }
    printf("%d", c);
    return 0;
}`,
    correctAnswer: '8',
    explanation: 'break leaves only the inner loop. For each of the 4 outer rounds, the inner loop counts j = 0 and j = 1 (2 increments) and stops at j = 2. Total = 4 * 2 = 8.',
    timeLimitSeconds: 30,
  },

  // 19. EASY - Code Fix
  {
    id: 19,
    type: 'code_fix',
    title: 'Fix the For Loop Header',
    description: 'This loop should print 0 to 4, but it does not compile. Fix the for line.',
    code: `#include <stdio.h>

int main() {
    for (int i = 0, i < 5, i++) {
        printf("%d ", i);
    }
    return 0;
}`,
    correctAnswer: 'for (int i = 0; i < 5; i++) {',
    explanation: 'The three parts of a for loop (init, condition, update) must be separated by semicolons, not commas.',
    timeLimitSeconds: 25,
  },

  // 20. EASY - MCQ
  {
    id: 20,
    type: 'mcq',
    title: 'Counting Stars',
    description: 'How many * characters does this pattern program print in total?',
    code: `#include <stdio.h>

int main() {
    for (int i = 1; i <= 3; i++) {
        for (int j = 1; j <= i; j++)
            printf("*");
        printf("\\n");
    }
    return 0;
}`,
    options: [
      { label: 'A', text: '3' },
      { label: 'B', text: '5' },
      { label: 'C', text: '6' },
      { label: 'D', text: '9' },
    ],
    correctAnswer: 'C',
    explanation: 'Row 1 prints 1 star, row 2 prints 2 stars and row 3 prints 3 stars. 1 + 2 + 3 = 6 stars forming a right triangle.',
    timeLimitSeconds: 20,
  },

  // ======================= UNIT 3: FUNCTIONS, RECURSION, ARRAYS, SEARCH (21-30) =======================

  // 21. EASY - Output
  {
    id: 21,
    type: 'output',
    title: 'Functions Inside Functions',
    description: 'What number is printed?',
    code: `#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main() {
    printf("%d", add(add(1, 2), add(3, 4)));
    return 0;
}`,
    correctAnswer: '10',
    explanation: 'The inner calls run first: add(1, 2) = 3 and add(3, 4) = 7. Then add(3, 7) = 10.',
    timeLimitSeconds: 20,
  },

  // 22. EASY - MCQ
  {
    id: 22,
    type: 'mcq',
    title: 'Valid Function Prototype',
    description: 'Which one is a correct function declaration (prototype)?',
    options: [
      { label: 'A', text: 'int add(int, int);' },
      { label: 'B', text: 'int add(int, int)' },
      { label: 'C', text: 'add int(int, int);' },
      { label: 'D', text: 'int add{int, int};' },
    ],
    correctAnswer: 'A',
    explanation: 'A prototype has the form: return_type function_name(argument types); and it ends with a semicolon. Option B misses the semicolon, C has the wrong order, and D uses braces instead of parentheses.',
    timeLimitSeconds: 15,
  },

  // 23. TOUGH - Output
  {
    id: 23,
    type: 'output',
    title: 'Pass by Value',
    description: 'What number does main print?',
    code: `#include <stdio.h>

void change(int x) {
    x = 99;
}

int main() {
    int n = 5;
    change(n);
    printf("%d", n);
    return 0;
}`,
    correctAnswer: '5',
    explanation: 'C passes arguments by value. The function receives a copy of n, so changing x does not affect n in main. n stays 5.',
    timeLimitSeconds: 25,
  },

  // 24. EASY - Output (from recursion notes)
  {
    id: 24,
    type: 'output',
    title: 'Recursive Factorial',
    description: 'What does this program print?',
    code: `#include <stdio.h>

int facto(int n) {
    if (n <= 1)
        return 1;
    else
        return n * facto(n - 1);
}

int main() {
    printf("%d", facto(5));
    return 0;
}`,
    correctAnswer: '120',
    explanation: 'facto(5) = 5 * facto(4) = 5 * 4 * facto(3) = 5 * 4 * 3 * 2 * 1 = 120. The base condition n <= 1 stops the recursion.',
    timeLimitSeconds: 20,
  },

  // 25. TOUGH (concept) - MCQ
  {
    id: 25,
    type: 'mcq',
    title: 'Missing Base Condition',
    description: 'A recursive function has no base (terminating) condition. What typically happens when it is called?',
    options: [
      { label: 'A', text: 'It returns 0 automatically' },
      { label: 'B', text: 'It stops after 10 calls' },
      { label: 'C', text: 'Stack overflow error' },
      { label: 'D', text: 'The compiler refuses to compile it' },
    ],
    correctAnswer: 'C',
    explanation: 'Without a base condition the function keeps calling itself, and each call uses stack memory. Eventually the stack runs out and the program crashes with a stack overflow error.',
    timeLimitSeconds: 20,
  },

  // 26. TOUGH - Output
  {
    id: 26,
    type: 'output',
    title: 'Print After the Recursive Call',
    description: 'What is printed by show(3)? (Digits only, no spaces.)',
    code: `#include <stdio.h>

void show(int n) {
    if (n == 0)
        return;
    show(n - 1);
    printf("%d", n);
}

int main() {
    show(3);
    return 0;
}`,
    correctAnswer: '123',
    explanation: 'show(3) calls show(2), which calls show(1), which calls show(0) and returns. Only then do the printf statements run, from the innermost call outwards: 1, then 2, then 3.',
    timeLimitSeconds: 30,
  },

  // 27. EASY - MCQ (2D array notes)
  {
    id: 27,
    type: 'mcq',
    title: 'Reading a 2D Array',
    description: 'In this matrix, what is the value of a[1][2]?',
    code: `int a[3][3] = {
    {1, 2, 3},
    {4, 5, 6},
    {7, 8, 9}
};`,
    options: [
      { label: 'A', text: '2' },
      { label: 'B', text: '4' },
      { label: 'C', text: '6' },
      { label: 'D', text: '8' },
    ],
    correctAnswer: 'C',
    explanation: 'Indexing starts at 0. a[1] is the second row {4, 5, 6} and index 2 is its third element, which is 6.',
    timeLimitSeconds: 20,
  },

  // 28. MEDIUM - Output (2D array)
  {
    id: 28,
    type: 'output',
    title: 'Diagonal of a Matrix',
    description: 'What number is printed?',
    code: `#include <stdio.h>

int main() {
    int a[3][3] = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    int s = 0;
    for (int i = 0; i < 3; i++)
        s += a[i][i];
    printf("%d", s);
    return 0;
}`,
    correctAnswer: '15',
    explanation: 'a[i][i] picks the main diagonal: a[0][0] = 1, a[1][1] = 5, a[2][2] = 9. 1 + 5 + 9 = 15.',
    timeLimitSeconds: 25,
  },

  // 29. EASY - Code Fix (linear search notes)
  {
    id: 29,
    type: 'code_fix',
    title: 'Linear Search Bug',
    description: 'This linear search always claims the number is found. Fix the if line.',
    code: `#include <stdio.h>

int main() {
    int a[5] = {4, 8, 15, 16, 23};
    int n = 99, flag = 0, i;
    for (i = 0; i < 5; i++) {
        if (n = a[i]) {
            flag = 1;
            break;
        }
    }
    if (flag == 1)
        printf("Found at position %d", i + 1);
    else
        printf("%d not found", n);
    return 0;
}`,
    correctAnswer: 'if (n == a[i]) {',
    explanation: 'n = a[i] assigns instead of comparing. Since a[0] is 4 (non-zero), the condition is true immediately. Use == to compare.',
    timeLimitSeconds: 25,
  },

  // 30. TOUGH - Output (linear search)
  {
    id: 30,
    type: 'output',
    title: 'Linear Search with Duplicates',
    description: 'What does this program print?',
    code: `#include <stdio.h>

int main() {
    int a[5] = {10, 20, 30, 20, 40};
    int n = 20, flag = 0, i;
    for (i = 0; i < 5; i++) {
        if (a[i] == n) {
            flag = 1;
            break;
        }
    }
    if (flag == 1)
        printf("%d", i + 1);
    else
        printf("NF");
    return 0;
}`,
    correctAnswer: '2',
    explanation: 'The first 20 is at index 1, so the break stops the loop with i = 1. The program prints the position i + 1 = 2. It never reaches the second 20 at index 3.',
    timeLimitSeconds: 30,
  },
];
