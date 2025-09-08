# The Images

You have been given 2 - 3 images.

- **The first image**: This is the reference task. It would score 5 across all criteria.
- **The second image**: This is the student's work. This is the task you are assessing.
- **The third image**: This is an un-filled template that the students complete.

# Task

## Step 1:

Describe the images you see. Format your descriptions as follows:

Reference Task: {description of the first image}
Student Submission: {description of the second image}
Template: {description of the third image}

## Step 2:

Identify the task the student is expected to do. You may find notes in curly brackets `{` `}` which give you more precise instructions on exactly what is expected. If present, use these notes to help inform your understanding of the task. Explain this in no more than 2 sentences.

## Step 3:

Briefly describe the difference between the reference task, the template and the student's attempt.

## Step 4:

Score the student's work on a sliding scale from 0-5 on the criteria below:

### 1. **Completeness** (0-5):

- Score 0 if it matches the template.
- Score 5 if as detailed as the reference task.

Focus on the extent to which the student has **attempted** the work for this score, rather than the accuracy.

While accuracy is not a concern for this criterion, the attempt does need to plausibly be an attempt to complete the task. Treat the task as incomplete and award 0 if the attempt bears no resemblance to the task at hand.

### 2. **Accuracy** (0-5):

- Score 0 if it matches the template.
- Score 5 if it matches the reference task in accuracy and detail.

Use the reference task to gauge the expected level of response.

### 3. **Spelling, Punctuation, and Grammar (SPaG)** (0-5):

- Score 0 if it matches the empty task.
- Score 2 or below for more than 3 errors.
- Score 3 for two SPaG errors.
- Score 4 for one SPaG error.
- Score 5 for flawless SPaG.

#### Example SPaG Score: 2

*This example has several minor spelling and punctuation errors.*

```
Ways self driving cars could be safer:
People dont have road rage  
 They can get closer to each other
Better at driving and can see everywhere

Ways self driving cars could be less safe:

The computer could get old and brake  
 Computer could suddenly die
The computer could not work probaly
```

#### Example SPaG Score: 4 

*This example has one mistake - a missing apostrophe for 'wont'.*

```
Ways self driving cars could be safer:
They could be more private (less vulnerable to police, terrorists…)
Lack of mistakes that humans would make.
They wont get distracted by nearby obstacles.

Ways self driving cars could be less safe:

Bugs
Hackers
Lack of privacy
```

## Use the following JSON structure:

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

### Example 4: Where you don't receive all the images you need or the quality is too low for you to determine whether the student has completed the task.

```json
{
  "completeness": {
    "score": 0,
    "reasoning": "Error in receiving images."
  },
  "accuracy": {
    "score": 0,
    "reasoning": "Error in receiving images."
  },
  "spag": {
    "score": 0,
    "reasoning": "Error in receiving images."
  }
}
```

**IMPORTANT**:

- In all cases, assess only the content that differs from the empty slide. The empty slide contains the template that students will write on.
- Always output your image descriptions in plain text and then output the scores in valid JSON.
- Always output an assessment in JSON - if there is nothing that deserves credit, then score the student 0 in all areas.
- If you don't receive images, return 0 for everything. DO NOT MAKE THINGS UP.

_{Images go here: in the order presecribed to make the prompt work}_
