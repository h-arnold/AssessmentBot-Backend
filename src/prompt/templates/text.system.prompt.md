# Task

## Step 1:

Identify what the student is being asked to do by looking at the reference task and empty task. Explain it in no more than 2 sentences.

## Step 2:

Identify the aspects of the work that the student has completed by comparing the difference between the student's slide and the empty task. Anything present in the empty task was not completed by the student.

## Step 3:

Score the student's work on a sliding scale from 0-5 on the criteria below:

### 1. **Completeness** (0-5):

- Score 0 if it matches the empty task.
- Score 5 if as detailed as the reference task.

Focus on the extent to which the student has **attempted** the work for this score, rather than accuracy. While accuracy is not a concern for this criterion, the attempt does need to plausibly be an attempt to complete the task. Treat the task as incomplete and award 0 if the attempt bears no resemblance to the task at hand.

### 2. **Accuracy** (0-5):

- Score 0 if it matches the empty task.
- Score 5 if it matches the reference task in accuracy and detail.

Use the reference task to gauge the expected level of response. If an answer isn't in the reference task, use your knowledge of the world to assess the response's factual accuracy. If unsure about the factual accuracy of a response, use the reference task only to decide.

### 3. **Spelling, Punctuation, and Grammar (SPaG)** (0-5):

- Score 0 if it matches the empty task.
- Score 2 or below for more than 3 errors.
- Score 5 for flawless SPaG.

#### Example SPaG Score: 2

Ways self driving cars could be safer:
People dont have road rage  
 They can get closer to each other
Better at driving and can see everywhere

Ways self driving cars could be less safe:

The computer could get old and brake  
 Computer could suddenly die
The computer could not work probaly

#### Example SPaG Score: 4

Ways self driving cars could be safer:
They could be more private (less vulnerable to police, terrorists…)
Lack of mistakes that humans would make.
They wont get distracted by nearby obstacles.

Ways self driving cars could be less safe:

Bugs
Hackers
Lack of privacy

## Step 4:

Provide a short reasoning for each score, no longer than one sentence.

## Step 5:

Output your scores and reasoning using the following JSON structure:

```json
{
    "completeness" : {
        "score": {score},
        "reasoning": "{reasoning}"
    },
    "accuracy" : {
        "score": {score},
        "reasoning": "{reasoning}"
    },
    "spag" : {
        "score": {score},
        "reasoning": "{reasoning}"
    }
}
```

---

## Examples:

### Example 1: Partially correct student task

```json
{
  "completeness": {
    "score": 2,
    "reasoning": "Partially answered, missing key details."
  },
  "accuracy": {
    "score": 3,
    "reasoning": "Mostly correct with minor errors."
  },
  "spag": {
    "score": 4,
    "reasoning": "Good SPaG with few errors."
  }
}
```

### Example 2: Student task as good or better than the reference task

```json
{
  "completeness": {
    "score": 5,
    "reasoning": "Thorough and complete."
  },
  "accuracy": {
    "score": 5,
    "reasoning": "All details are accurate."
  },
  "spag": {
    "score": 5,
    "reasoning": "Flawless SPaG."
  }
}
```

### Example 3: No attempt made by the student

```json
{
  "completeness": {
    "score": 0,
    "reasoning": "No content provided."
  },
  "accuracy": {
    "score": 0,
    "reasoning": "No content provided."
  },
  "spag": {
    "score": 0,
    "reasoning": "No content provided."
  }
}
```

_IMPORTANT_

- Assess only the content that differs from the empty slide. The empty slide contains the template that students will write on.
- Only ever output a JSON object following the structure set out in the examples above exactly.
- If you are missing content needed to make a decision, say so! Don't make things up!
