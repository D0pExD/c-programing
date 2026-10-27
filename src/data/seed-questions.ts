import { Question } from '@/types/tournament';

export const SEED_QUESTIONS: Question[] = [
  // ==========================================
  // ROUND 1: PREDICT THE OUTPUT
  // ==========================================
  {
    id: 'r1-q1',
    round: 1,
    type: 'SINGLE_CHOICE',
    title: 'Pre-increment vs Post-increment in C',
    description: 'Analyze how pre-increment and post-increment behave within an arithmetic expression.',
    codeSnippet: `#include <stdio.h>

int main() {
    int x = 5;
    int y = ++x + x++;
    printf("%d, %d\\n", x, y);
    return 0;
}`,
    options: [
      { id: 'opt-a', label: 'A', text: '7, 12' },
      { id: 'opt-b', label: 'B', text: '7, 13' },
      { id: 'opt-c', label: 'C', text: '6, 11' },
      { id: 'opt-d', label: 'D', text: 'Undefined behavior / Compiler dependent' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'In typical GCC evaluation: ++x increments x from 5 to 6. Then 6 + 6 evaluates to 12. Finally, post-increment increments x to 7.',
    difficulty: 'EASY',
    timeLimitSeconds: 30,
    basePoints: 100,
    speedBonusMax: 50,
    tags: ['operators', 'precedence'],
    orderIndex: 1,
  },
  {
    id: 'r1-q2',
    round: 1,
    type: 'SINGLE_CHOICE',
    title: 'Pointer Arithmetic & Array Decay',
    description: 'Determine the dereferenced pointer offset into an integer array.',
    codeSnippet: `#include <stdio.h>

int main() {
    int arr[] = {10, 20, 30, 40, 50};
    int *ptr = arr;
    printf("%d, %d\\n", *(ptr + 2), *ptr + 2);
    return 0;
}`,
    options: [
      { id: 'opt-a', label: 'A', text: '30, 12' },
      { id: 'opt-b', label: 'B', text: '30, 30' },
      { id: 'opt-c', label: 'C', text: '20, 12' },
      { id: 'opt-d', label: 'D', text: '12, 30' },
    ],
    correctAnswer: 'opt-a',
    explanation: '*(ptr + 2) shifts the pointer 2 elements forward to arr[2] (value 30). *ptr + 2 dereferences arr[0] (10) and adds 2, yielding 12.',
    difficulty: 'MEDIUM',
    timeLimitSeconds: 35,
    basePoints: 100,
    speedBonusMax: 50,
    tags: ['pointers', 'arrays'],
    orderIndex: 2,
  },
  {
    id: 'r1-q3',
    round: 1,
    type: 'SINGLE_CHOICE',
    title: 'Sizeof String Literal vs Array',
    description: 'What does sizeof evaluate to for character arrays versus string pointers?',
    codeSnippet: `#include <stdio.h>

int main() {
    char s1[] = "BCA";
    char *s2 = "BCA";
    printf("%lu, %lu\\n", sizeof(s1), sizeof(s2));
    return 0;
}`,
    options: [
      { id: 'opt-a', label: 'A', text: '4, 8' },
      { id: 'opt-b', label: 'B', text: '3, 3' },
      { id: 'opt-c', label: 'C', text: '4, 4' },
      { id: 'opt-d', label: 'D', text: '3, 8' },
    ],
    correctAnswer: 'opt-a',
    explanation: 's1 includes the null terminator \\0 (3 chars + 1 = 4 bytes). s2 is a pointer, which is 8 bytes on a modern 64-bit architecture.',
    difficulty: 'MEDIUM',
    timeLimitSeconds: 30,
    basePoints: 100,
    speedBonusMax: 50,
    tags: ['strings', 'sizeof', 'pointers'],
    orderIndex: 3,
  },

  // ==========================================
  // ROUND 2: DEBUG THE CODE
  // ==========================================
  {
    id: 'r2-q1',
    round: 2,
    type: 'BUG_IDENTIFY',
    title: 'Faulty scanf in Dynamic Input',
    description: 'Find the bug in this program attempting to read student test scores and assign the proper fix.',
    codeSnippet: `#include <stdio.h>

int main() {
    int score = 0;
    printf("Enter exam score: ");
    scanf("%d", score); // Line 6
    if (score >= 40) {
        printf("PASSED\\n");
    }
    return 0;
}`,
    options: [
      { id: 'fix-1', label: 'Fix 1', text: 'Change Line 6 to: scanf("%d", &score);' },
      { id: 'fix-2', label: 'Fix 2', text: 'Change Line 5 to: score = malloc(sizeof(int));' },
      { id: 'fix-3', label: 'Fix 3', text: 'Change Line 7 to: if (&score >= 40)' },
      { id: 'fix-4', label: 'Fix 4', text: 'Change Line 6 to: scanf("%s", &score);' },
    ],
    correctAnswer: '6', // Line 6 is the bug
    bugLineNumber: 6,
    fixBonusOptionId: 'fix-1',
    explanation: 'Line 6 passes score by value rather than passing the memory address &score to scanf. This results in an immediate segmentation fault.',
    difficulty: 'EASY',
    timeLimitSeconds: 40,
    basePoints: 150,
    speedBonusMax: 0,
    tags: ['debugging', 'pointers', 'scanf'],
    orderIndex: 4,
  },
  {
    id: 'r2-q2',
    round: 2,
    type: 'BUG_IDENTIFY',
    title: 'Array Out-of-Bounds Off-By-One',
    description: 'Identify the line containing an illegal memory access in this sum accumulation loop.',
    codeSnippet: `#include <stdio.h>

int main() {
    int arr[5] = {1, 2, 3, 4, 5};
    int total = 0;
    for (int i = 0; i <= 5; i++) { // Line 6
        total += arr[i];          // Line 7
    }
    printf("Sum = %d\\n", total);
    return 0;
}`,
    options: [
      { id: 'fix-a', label: 'Fix A', text: 'Change Line 6 loop condition to: i < 5' },
      { id: 'fix-b', label: 'Fix B', text: 'Change Line 4 initialization to: int arr[6]' },
      { id: 'fix-c', label: 'Fix C', text: 'Change Line 7 to: total += arr[i - 1]' },
      { id: 'fix-d', label: 'Fix D', text: 'Change Line 6 to: for (int i = 1; i <= 5; i++)' },
    ],
    correctAnswer: '6',
    bugLineNumber: 6,
    fixBonusOptionId: 'fix-a',
    explanation: 'Line 6 uses i <= 5 which iterates through arr[5], accessing memory beyond the bounds of the 5-element array (indices 0 to 4).',
    difficulty: 'MEDIUM',
    timeLimitSeconds: 40,
    basePoints: 150,
    speedBonusMax: 0,
    tags: ['arrays', 'off-by-one', 'bounds'],
    orderIndex: 5,
  },

  // ==========================================
  // ROUND 3: ARRAY BATTLESHIP
  // ==========================================
  {
    id: 'r3-q1',
    round: 3,
    type: 'ARRAY_COORD',
    title: '2D Array Row-Major Memory Mapping',
    description: 'In an int matrix[4][4] where base address is 2000 and sizeof(int)=4, find the memory offset for element matrix[2][3]. Correct answer unlocks 1 Radar Attack Token!',
    codeSnippet: `// Matrix declared as:
int matrix[4][4];
// Base address: 2000
// Memory formula in row-major order:
// Address(matrix[i][j]) = Base + (i * cols + j) * sizeof(int)`,
    options: [
      { id: 'opt-a', label: 'A', text: '2044' },
      { id: 'opt-b', label: 'B', text: '2024' },
      { id: 'opt-c', label: 'C', text: '2040' },
      { id: 'opt-d', label: 'D', text: '2036' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'Offset = (2 * 4 + 3) = 11 elements. 11 * 4 bytes = 44 bytes. Address = 2000 + 44 = 2044.',
    difficulty: 'MEDIUM',
    timeLimitSeconds: 45,
    basePoints: 100,
    speedBonusMax: 25,
    tags: ['2d-arrays', 'memory-mapping', 'battleship'],
    orderIndex: 6,
  },
  {
    id: 'r3-q2',
    round: 3,
    type: 'ARRAY_COORD',
    title: 'Matrix Transpose Coordinate Inversion',
    description: 'When transposing matrix A into matrix T, which index coordinate receives the value from A[1][3]?',
    codeSnippet: `int A[4][4];
int T[4][4];

for (int r = 0; r < 4; r++) {
    for (int c = 0; c < 4; c++) {
        T[c][r] = A[r][c];
    }
}`,
    options: [
      { id: 'opt-a', label: 'A', text: 'T[3][1]' },
      { id: 'opt-b', label: 'B', text: 'T[1][3]' },
      { id: 'opt-c', label: 'C', text: 'T[2][2]' },
      { id: 'opt-d', label: 'D', text: 'T[0][3]' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'In matrix transpose, element at row r and col c maps to row c and col r. Thus A[1][3] maps to T[3][1].',
    difficulty: 'EASY',
    timeLimitSeconds: 30,
    basePoints: 100,
    speedBonusMax: 25,
    tags: ['matrices', 'transpose'],
    orderIndex: 7,
  },

  // ==========================================
  // ROUND 4: RECURSION RUSH
  // ==========================================
  {
    id: 'r4-q1',
    round: 4,
    type: 'CALL_STACK',
    title: 'Factorial Call Stack Execution',
    description: 'Trace the recursive activation frames and return values for fact(4).',
    codeSnippet: `#include <stdio.h>

int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
}

int main() {
    printf("%d", fact(4));
    return 0;
}`,
    options: [
      { id: 'opt-a', label: 'A', text: 'fact(4) -> fact(3) -> fact(2) -> fact(1) = 24' },
      { id: 'opt-b', label: 'B', text: 'fact(4) -> fact(3) -> fact(2) -> fact(0) = 0' },
      { id: 'opt-c', label: 'C', text: 'fact(1) -> fact(2) -> fact(3) -> fact(4) = 16' },
      { id: 'opt-d', label: 'D', text: 'Stack overflow exception' },
    ],
    correctAnswer: 'opt-a',
    callStackFrames: [
      { call: 'fact(4)', depth: 1, returns: '4 * fact(3) -> 24' },
      { call: 'fact(3)', depth: 2, returns: '3 * fact(2) -> 6' },
      { call: 'fact(2)', depth: 3, returns: '2 * fact(1) -> 2' },
      { call: 'fact(1)', depth: 4, returns: 'base case -> 1' },
    ],
    explanation: 'The call stack grows downward until fact(1) hits base condition n <= 1, then unwinds: 1 -> 2*1=2 -> 3*2=6 -> 4*6=24.',
    difficulty: 'MEDIUM',
    timeLimitSeconds: 40,
    basePoints: 150,
    speedBonusMax: 40,
    tags: ['recursion', 'call-stack', 'factorial'],
    orderIndex: 8,
  },
  {
    id: 'r4-q2',
    round: 4,
    type: 'CALL_STACK',
    title: 'Missing Base Case in Recursive Sum',
    description: 'What happens when executing this recursive sum function with input n = 3?',
    codeSnippet: `#include <stdio.h>

int sum(int n) {
    // Note: Base condition missing!
    return n + sum(n - 1);
}

int main() {
    printf("%d", sum(3));
    return 0;
}`,
    options: [
      { id: 'opt-a', label: 'A', text: 'Stack Overflow / Segmentation Fault' },
      { id: 'opt-b', label: 'B', text: 'Returns 6' },
      { id: 'opt-c', label: 'C', text: 'Returns 0' },
      { id: 'opt-d', label: 'D', text: 'Compiler error' },
    ],
    correctAnswer: 'opt-a',
    callStackFrames: [
      { call: 'sum(3)', depth: 1, returns: 'pending...' },
      { call: 'sum(2)', depth: 2, returns: 'pending...' },
      { call: 'sum(1)', depth: 3, returns: 'pending...' },
      { call: 'sum(0)', depth: 4, returns: 'pending...' },
      { call: 'sum(-1)', depth: 5, returns: 'STACK OVERFLOW' },
    ],
    explanation: 'Without a base condition, n continues decrementing indefinitely into negative numbers until the call stack memory is exhausted.',
    difficulty: 'EASY',
    timeLimitSeconds: 30,
    basePoints: 100,
    speedBonusMax: 30,
    tags: ['recursion', 'infinite-recursion'],
    orderIndex: 9,
  },

  // ==========================================
  // ROUND 5: FINAL BOSS
  // ==========================================
  {
    id: 'r5-q1',
    round: 5,
    type: 'FINAL_WAGER',
    title: 'THE FINAL BOSS: Double Pointers & Dynamic Memory',
    description: 'The ultimate C challenge. Finalist captains: place your wagers carefully! A correct answer gains your wager, an incorrect answer loses it!',
    codeSnippet: `#include <stdio.h>
#include <stdlib.h>

void modify(int **ptr) {
    static int val = 99;
    *ptr = &val;
}

int main() {
    int x = 42;
    int *p = &x;
    modify(&p);
    printf("%d, %d\\n", x, *p);
    return 0;
}`,
    options: [
      { id: 'opt-a', label: 'A', text: '42, 99' },
      { id: 'opt-b', label: 'B', text: '99, 99' },
      { id: 'opt-c', label: 'C', text: '42, 42' },
      { id: 'opt-d', label: 'D', text: 'Segmentation fault due to static memory' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'x remains 42 because its memory was untouched. modify(&p) passes the address of pointer p, so *ptr redirects pointer p to point to the static variable val (99). Thus *p prints 99 while x is still 42.',
    difficulty: 'HARD',
    timeLimitSeconds: 60,
    basePoints: 0, // Determined entirely by team wager!
    speedBonusMax: 0,
    tags: ['final-boss', 'pointers-to-pointers', 'wager'],
    orderIndex: 10,
  },
];
