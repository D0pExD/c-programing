export type QuestionType = 'mcq' | 'output';

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
  correctAnswer: string; // For MCQ: 'A', 'B', 'C', 'D'. For output: normalized string
  explanation: string;
  timeLimitSeconds: number; // default 20s
}

export const QUESTIONS: Question[] = [
  // 1. Output prediction
  {
    id: 1,
    type: 'output',
    title: 'Pre-increment vs Post-increment',
    description: 'What is the exact output printed by this program?',
    code: `#include <stdio.h>

int main() {
    int x = 5;
    int y = ++x + x++;
    printf("%d", y);
    return 0;
}`,
    correctAnswer: '12',
    explanation: '++x increments x to 6. Then 6 + 6 evaluates to 12. Post-increment increases x to 7 afterward.',
    timeLimitSeconds: 20,
  },

  // 2. MCQ
  {
    id: 2,
    type: 'mcq',
    title: 'Size of Pointer in 64-bit C',
    description: 'What will be the output on a standard 64-bit architecture?',
    code: `#include <stdio.h>

int main() {
    int *p;
    char *c;
    printf("%lu, %lu", sizeof(p), sizeof(c));
    return 0;
}`,
    options: [
      { label: 'A', text: '4, 1' },
      { label: 'B', text: '8, 8' },
      { label: 'C', text: '4, 4' },
      { label: 'D', text: '8, 1' },
    ],
    correctAnswer: 'B',
    explanation: 'On all modern 64-bit architectures, any memory pointer is 8 bytes regardless of the type it points to.',
    timeLimitSeconds: 20,
  },

  // 3. Output prediction
  {
    id: 3,
    type: 'output',
    title: 'Array Pointer Dereference',
    description: 'Type the exact integer printed by printf.',
    code: `#include <stdio.h>

int main() {
    int arr[] = {10, 20, 30, 40};
    int *ptr = arr;
    printf("%d", *(ptr + 2));
    return 0;
}`,
    correctAnswer: '30',
    explanation: 'ptr points to arr[0]. ptr + 2 advances by 2 elements to arr[2], which has the value 30.',
    timeLimitSeconds: 15,
  },

  // 4. MCQ
  {
    id: 4,
    type: 'mcq',
    title: 'String Length vs Sizeof',
    description: 'What is printed by this program?',
    code: `#include <stdio.h>
#include <string.h>

int main() {
    char s[] = "BCA";
    printf("%lu, %lu", sizeof(s), strlen(s));
    return 0;
}`,
    options: [
      { label: 'A', text: '3, 3' },
      { label: 'B', text: '4, 3' },
      { label: 'C', text: '4, 4' },
      { label: 'D', text: '3, 4' },
    ],
    correctAnswer: 'B',
    explanation: 'sizeof includes the invisible null terminator \\0 (4 bytes). strlen only counts visible characters (3).',
    timeLimitSeconds: 20,
  },

  // 5. Output prediction
  {
    id: 5,
    type: 'output',
    title: 'Bitwise Left Shift',
    description: 'What integer is printed?',
    code: `#include <stdio.h>

int main() {
    int a = 5; // binary: 101
    printf("%d", a << 2);
    return 0;
}`,
    correctAnswer: '20',
    explanation: 'Left-shifting by 2 bits multiplies by 2^2 (4). 5 * 4 = 20 (binary 10100).',
    timeLimitSeconds: 15,
  },

  // 6. MCQ
  {
    id: 6,
    type: 'mcq',
    title: 'Switch Case Without Break',
    description: 'What will be printed to stdout?',
    code: `#include <stdio.h>

int main() {
    int x = 2;
    switch (x) {
        case 1: printf("A");
        case 2: printf("B");
        case 3: printf("C");
        default: printf("D");
    }
    return 0;
}`,
    options: [
      { label: 'A', text: 'B' },
      { label: 'B', text: 'BCD' },
      { label: 'C', text: 'BC' },
      { label: 'D', text: 'BD' },
    ],
    correctAnswer: 'B',
    explanation: 'Because there is no break statement, execution falls through case 2 -> case 3 -> default, printing BCD.',
    timeLimitSeconds: 20,
  },

  // 7. Output prediction
  {
    id: 7,
    type: 'output',
    title: 'Ternary Operator Evaluation',
    description: 'What number is printed?',
    code: `#include <stdio.h>

int main() {
    int a = 10, b = 20;
    int max = (a > b) ? a : b;
    printf("%d", max + 5);
    return 0;
}`,
    correctAnswer: '25',
    explanation: '(10 > 20) is false, so b (20) is selected. 20 + 5 = 25.',
    timeLimitSeconds: 15,
  },

  // 8. MCQ
  {
    id: 8,
    type: 'mcq',
    title: 'Format Specifier for Address',
    description: 'Which format specifier should be used to print a memory address pointer?',
    options: [
      { label: 'A', text: '%u' },
      { label: 'B', text: '%x' },
      { label: 'C', text: '%p' },
      { label: 'D', text: '%d' },
    ],
    correctAnswer: 'C',
    explanation: '%p is the standard C format specifier defined to print pointer memory addresses in hexadecimal.',
    timeLimitSeconds: 15,
  },

  // 9. Output prediction
  {
    id: 9,
    type: 'output',
    title: 'Recursive Factorial Call',
    description: 'What does this recursive function return for fact(4)?',
    code: `#include <stdio.h>

int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
}

int main() {
    printf("%d", fact(4));
    return 0;
}`,
    correctAnswer: '24',
    explanation: '4 * 3 * 2 * 1 = 24.',
    timeLimitSeconds: 15,
  },

  // 10. MCQ
  {
    id: 10,
    type: 'mcq',
    title: 'Static Variable Behavior',
    description: 'What will this loop output?',
    code: `#include <stdio.h>

void counter() {
    static int count = 0;
    count++;
    printf("%d ", count);
}

int main() {
    counter();
    counter();
    counter();
    return 0;
}`,
    options: [
      { label: 'A', text: '1 1 1' },
      { label: 'B', text: '1 2 3' },
      { label: 'C', text: '0 1 2' },
      { label: 'D', text: '3 3 3' },
    ],
    correctAnswer: 'B',
    explanation: 'Static variables retain their values across multiple function invocations in the program lifetime.',
    timeLimitSeconds: 20,
  },

  // 11. Output prediction
  {
    id: 11,
    type: 'output',
    title: 'Modulo Arithmetic',
    description: 'What value is printed?',
    code: `#include <stdio.h>

int main() {
    int a = 17 % 5;
    printf("%d", a);
    return 0;
}`,
    correctAnswer: '2',
    explanation: '17 divided by 5 is 3 with remainder 2.',
    timeLimitSeconds: 12,
  },

  // 12. MCQ
  {
    id: 12,
    type: 'mcq',
    title: 'Logical AND Short-Circuiting',
    description: 'What gets printed?',
    code: `#include <stdio.h>

int main() {
    int a = 0, b = 5;
    if (a && ++b) {
        printf("YES");
    }
    printf("%d", b);
    return 0;
}`,
    options: [
      { label: 'A', text: '5' },
      { label: 'B', text: '6' },
      { label: 'C', text: 'YES5' },
      { label: 'D', text: 'YES6' },
    ],
    correctAnswer: 'A',
    explanation: 'In C, logical AND short-circuits if the first operand is 0 (false). ++b is never executed, so b remains 5.',
    timeLimitSeconds: 20,
  },

  // 13. Output prediction
  {
    id: 13,
    type: 'output',
    title: 'Character ASCII Offset',
    description: 'What character is printed?',
    code: `#include <stdio.h>

int main() {
    char ch = 'A';
    printf("%c", ch + 3);
    return 0;
}`,
    correctAnswer: 'D',
    explanation: 'ASCII of A + 3 = ASCII of D (65 + 3 = 68 = \'D\').',
    timeLimitSeconds: 15,
  },

  // 14. MCQ
  {
    id: 14,
    type: 'mcq',
    title: 'Dynamic Memory Allocation Function',
    description: 'Which C function allocates memory and initializes all bytes to zero?',
    options: [
      { label: 'A', text: 'malloc()' },
      { label: 'B', text: 'calloc()' },
      { label: 'C', text: 'realloc()' },
      { label: 'D', text: 'alloc()' },
    ],
    correctAnswer: 'B',
    explanation: 'calloc() allocates memory and zeros out every byte, unlike malloc() which leaves memory uninitialized.',
    timeLimitSeconds: 15,
  },

  // 15. Output prediction
  {
    id: 15,
    type: 'output',
    title: 'While Loop Counter',
    description: 'What is the final value printed?',
    code: `#include <stdio.h>

int main() {
    int i = 1;
    while (i < 10) {
        i *= 2;
    }
    printf("%d", i);
    return 0;
}`,
    correctAnswer: '16',
    explanation: 'i steps: 1 -> 2 -> 4 -> 8 -> 16 (16 is not < 10, loop ends and prints 16).',
    timeLimitSeconds: 15,
  },

  // 16. MCQ
  {
    id: 16,
    type: 'mcq',
    title: '2D Array Indexing',
    description: 'Given int m[3][4], how many total integer elements does the array hold?',
    options: [
      { label: 'A', text: '7' },
      { label: 'B', text: '12' },
      { label: 'C', text: '14' },
      { label: 'D', text: '6' },
    ],
    correctAnswer: 'B',
    explanation: '3 rows * 4 columns = 12 elements.',
    timeLimitSeconds: 12,
  },

  // 17. Output prediction
  {
    id: 17,
    type: 'output',
    title: 'Pointer Value Modification',
    description: 'What integer does x hold at the end?',
    code: `#include <stdio.h>

int main() {
    int x = 100;
    int *p = &x;
    *p = 250;
    printf("%d", x);
    return 0;
}`,
    correctAnswer: '250',
    explanation: '*p modifies the memory address where x is stored to 250.',
    timeLimitSeconds: 15,
  },

  // 18. MCQ
  {
    id: 18,
    type: 'mcq',
    title: 'Standard File Descriptor for stdin',
    description: 'What integer file descriptor number is assigned to stdin in POSIX/C?',
    options: [
      { label: 'A', text: '0' },
      { label: 'B', text: '1' },
      { label: 'C', text: '2' },
      { label: 'D', text: '-1' },
    ],
    correctAnswer: 'A',
    explanation: '0 is stdin, 1 is stdout, 2 is stderr.',
    timeLimitSeconds: 15,
  },

  // 19. Output prediction
  {
    id: 19,
    type: 'output',
    title: 'Nested For Loops',
    description: 'How many times will "X" be printed?',
    code: `#include <stdio.h>

int main() {
    int count = 0;
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 4; j++) {
            count++;
        }
    }
    printf("%d", count);
    return 0;
}`,
    correctAnswer: '12',
    explanation: 'Outer loop runs 3 times, inner loop runs 4 times per outer iteration. 3 * 4 = 12.',
    timeLimitSeconds: 15,
  },

  // 20. MCQ
  {
    id: 20,
    type: 'mcq',
    title: 'Header for malloc and free',
    description: 'Which header file must be included to use malloc() and free()?',
    options: [
      { label: 'A', text: '<stdio.h>' },
      { label: 'B', text: '<stdlib.h>' },
      { label: 'C', text: '<memory.h>' },
      { label: 'D', text: '<alloc.h>' },
    ],
    correctAnswer: 'B',
    explanation: '<stdlib.h> declares dynamic memory management functions malloc(), calloc(), realloc(), and free().',
    timeLimitSeconds: 12,
  },
];
