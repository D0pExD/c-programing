# ⚡ C ARENA — Fastest Finger First (BCA C Tournament)

A clean, high-performance, real-time **Fastest Finger First** C programming quiz platform.

Built for university **BCA classrooms**:
- Students scan the QR code / open the link on their mobile phones.
- Enter **Name** & **Roll Number** to join.
- Fast and accurate answers earn **Base Points + Speed Bonus**.
- **The one with the most points wins!**

---

## 🚀 Live Routes

| Route | Role |
|---|---|
| `/` | **Student Screen (Mobile-First)**: Enter Name & Roll No, answer MCQs & Output questions with instant time feedback. |
| `/host` | **Host Controller**: Launch questions, reveal answers, show leaderboard, jump between questions, or seed mock students. |
| `/display` | **Projector Big-Screen (16:9)**: Giant QR code, countdown timer, C code block, live submission counts, and winners podium. |

---

## ⚡ How Fastest Finger First Scoring Works

- **Base Points**: 100 points for a correct answer.
- **Speed Bonus**: Up to 100 extra points based on how quickly the answer is submitted!
  $$\text{Speed Ratio} = \frac{\text{Time Limit} - \text{Response Time}}{\text{Time Limit}}$$
  $$\text{Total Points} = 100 + \text{round}(\text{Speed Ratio} \times 100)$$
  - *Example*: In a 20-second question, answering in **1.8s** awards **~191 PTS**!
  - Answering in **18s** awards **~110 PTS**.
  - Incorrect or expired answers award **0 PTS**.
- **Leaderboard Ranking**: Ranked strictly by **Highest Total Score** (with tie-breaks decided by most correct answers and fastest cumulative response time).

---

## 📝 Supported Question Types

The platform supports both:
1. **Multiple Choice (`mcq`)**: 4 tap-to-submit options (A, B, C, D).
2. **Output Prediction (`output`)**: Students type the exact output printed by the C code (e.g., `12`, `Hello`, `24`). Automatically handles whitespace trimming and case-normalization.

### How to Add / Replace Your 30–40 Questions
Simply open [`src/data/questions.ts`](file:///Users/d0pe/Documents/GitHub/c-programing/src/data/questions.ts) and add your questions array:

```ts
{
  id: 1,
  type: 'output', // or 'mcq'
  title: 'Pre-increment Evaluation',
  code: '#include <stdio.h>\nint main() { ... }',
  correctAnswer: '12',
  explanation: '++x increments first, then adds...',
  timeLimitSeconds: 20,
}
```

---

## 🛠️ Quick Commands

```bash
# Start local dev server
npm run dev

# Run automated tests
npm test

# Build for production
npm run build
```
